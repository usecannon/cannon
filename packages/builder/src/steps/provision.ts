import _ from 'lodash';
import Debug from 'debug';
import { z } from 'zod';

import {
  ChainBuilderContext,
  ChainArtifacts,
  ChainBuilderContextWithHelpers,
  DeploymentState,
  PackageState,
} from '../types';
import { build, createInitialContext, getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime, Events } from '../runtime';
import { CANNON_CHAIN_ID } from '../constants';

const debug = Debug('cannon:builder:provision');

const configSchema = z.object({
  source: z.string({
    required_error: 'source is required',
    invalid_type_error: "source must be a string",
  }),
}).merge(
  z.object({
      chainId: z.number().int().lte(32),
      sourcePreset: z.string({
        invalid_type_error: "sourcePreset must be a string",
      }),
      targetPreset: z.string({
        invalid_type_error: "targetPreset must be a string",
      }),
      options: z.record(z.string({
        invalid_type_error: "options items must be strings",
      })),
      tags: z.array(z.string({
        invalid_type_error: "tags items must be strings",
      })),
      depends: z.array(z.string({
        invalid_type_error: "depends items must be strings",
      })),
  }).deepPartial()
)

export type Config = z.infer<typeof configSchema>;

const validateConfig = (config: Config) => {
  return configSchema.parse(config)
}

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  label: 'provision',

  validate: configSchema,

  async getState(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContextWithHelpers,
    config: Config,
    packageState: PackageState
  ) {
    const importLabel = packageState.currentLabel?.split('.')[1] || '';
    const cfg = this.configInject(ctx, config, packageState);

    const sourcePreset = config.sourcePreset ?? 'main';
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    if (ctx.imports[importLabel]?.url) {
      const prevUrl = ctx.imports[importLabel].url!;

      if ((await runtime.readBlob(prevUrl))!.status === 'partial') {
        // partial build always need to be re-evaluated
        debug('forcing rebuild because deployment is partial');
        return 'REBUILD PARTIAL DEPLOYMENT ' + Math.random();
      }
    }

    const srcUrl = await runtime.registry.getUrl(cfg.source, `${chainId}-${sourcePreset}`);

    return {
      url: srcUrl,
      options: cfg.options,
      targetPreset: cfg.targetPreset,
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config, packageState: PackageState) {
    validateConfig(config);

    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);
    config.sourcePreset = _.template(config.sourcePreset)(ctx) || 'main';
    config.targetPreset = _.template(config.targetPreset)(ctx) || `with-${packageState.name}`;

    if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return _.template(v)(ctx);
      });
    }

    if (config.tags) {
      config.tags = config.tags.map((t) => _.template(t)(ctx));
    }

    return config;
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const importLabel = packageState.currentLabel.split('.')[1] || '';
    debug('exec', config);

    validateConfig(config);

    const sourcePreset = config.sourcePreset ?? 'main';
    const targetPreset = config.targetPreset ?? 'main';
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    // try to read the chain definition we are going to use
    const deployInfo = await runtime.readDeploy(config.source, sourcePreset, chainId);
    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${config.source}. please make sure it exists for preset ${sourcePreset} and network ${chainId}.`
      );
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.options || {}) };

    debug('provisioning package options', importPkgOptions);

    const def = new ChainDefinition(deployInfo.def);

    // always treat upstream state as what is used if its available. otherwise, we might have a state from a previous upgrade.
    // if all else fails, we can load from scratch (aka this is first deployment)
    let prevState: DeploymentState = {};
    let prevMiscUrl = null;
    if (ctx.imports[importLabel]?.url) {
      const prevUrl = ctx.imports[importLabel].url!;
      debug(`using state from previous deploy: ${prevUrl}`);
      const prevDeployInfo = await runtime.readBlob(prevUrl);
      prevState = prevDeployInfo!.state;
      prevMiscUrl = prevDeployInfo!.miscUrl;
    } else {
      // sanity: there shouldn't already be a build in our way
      // if there is, we need to overwrite it. print out a warning.
      if (await runtime.readDeploy(config.source, targetPreset, runtime.chainId)) {
        console.warn(
          'warn: there is a preexisting deployment for this preset/chainId. this build will overwrite. did you mean `import`?'
        );
      }

      debug('no previous state found, deploying from scratch');
    }

    // TODO: needs npm package from the manifest
    const initialCtx = await createInitialContext(def, deployInfo.meta, runtime.chainId, importPkgOptions);

    // use separate runtime to ensure everything is clear
    // we override `getArtifact` to use a simple loader from the upstream misc data to ensure that any contract upgrades are captured as expected
    // but if any other misc changes are generated they will still be preserved through the new separate context misc
    const upstreamMisc = await runtime.readBlob(deployInfo.miscUrl);
    const importRuntime = runtime.derive({
      getArtifact: (n) => {
        return upstreamMisc.artifacts[n];
      },
    });

    let partialDeploy = false;
    importRuntime.on(Events.SkipDeploy, () => {
      partialDeploy = true;
    });

    // need to import the misc data for the imported package
    if (prevMiscUrl) {
      debug('load misc');
      await importRuntime.restoreMisc(prevMiscUrl);
    }

    debug('start build');
    const builtState = await build(importRuntime, def, prevState, initialCtx);
    debug('finish build. is partial:', partialDeploy);

    const newMiscUrl = await importRuntime.recordMisc();

    debug('new misc:', newMiscUrl);

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.putDeploy({
      def: def.toJson(),
      miscUrl: newMiscUrl || '',
      options: importPkgOptions,
      state: builtState,
      meta: deployInfo.meta,
      status: partialDeploy ? 'partial' : 'complete',
      chainId,
    });

    if (!newSubDeployUrl) {
      console.warn('warn: cannot record built state for import nested state');
    } else {
      await runtime.registry.publish(
        [config.source, ...(config.tags || ['latest']).map((t) => config.source.split(':')[0] + ':' + t)],
        `${runtime.chainId}-${targetPreset}`,
        newSubDeployUrl,
        (await runtime.registry.getMetaUrl(config.source, `${chainId}-${config.sourcePreset}`)) || ''
      );
    }

    return {
      imports: {
        [importLabel]: {
          url: newSubDeployUrl || '',
          tags: config.tags || ['latest'],
          preset: targetPreset,
          ...(await getOutputs(importRuntime, def, builtState))!,
        },
      },
    };
  },

  timeout: 3600000,
};
