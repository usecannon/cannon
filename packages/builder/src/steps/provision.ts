import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainArtifacts, ChainBuilderContextWithHelpers, DeploymentState } from '../types';
import { build, createInitialContext, getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime, Events } from '../runtime';
import { CANNON_CHAIN_ID } from '../constants';

const debug = Debug('cannon:builder:provision');

const config = {
  properties: {
    source: { type: 'string' },
  },
  optionalProperties: {
    chainId: { type: 'int32' },
    sourcePreset: { type: 'string' },
    targetPreset: { type: 'string' },
    options: {
      values: { type: 'string' },
    },
    tags: { elements: { type: 'string' } },
    depends: { elements: { type: 'string' } },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config, currentLabel?: string) {
    const importLabel = currentLabel?.split('.')[1] || '';
    const cfg = this.configInject(ctx, config);

    const sourcePreset = config.sourcePreset ?? 'main';
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    if (ctx.imports[importLabel].url) {
      const prevUrl = ctx.imports[importLabel].url;

      if ((await runtime.loader.readMisc(prevUrl))!.status === 'partial') {
        // partial build always need to be re-evaluated
        return 'REBUILD PARTIAL DEPLOYMENT ' + Math.random();
      }
    }

    const srcUrl = await runtime.loader.resolver.getUrl(cfg.source, `${chainId}-${sourcePreset}`);

    return {
      url: srcUrl,
      options: cfg.options,
      targetPreset: cfg.targetPreset,
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);
    config.sourcePreset = _.template(config.sourcePreset)(ctx) || 'main';
    config.targetPreset = _.template(config.targetPreset)(ctx) || 'main';

    if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    currentLabel: string
  ): Promise<ChainArtifacts> {
    const importLabel = currentLabel?.split('.')[1] || '';
    debug('exec', config);

    const sourcePreset = config.sourcePreset ?? 'main';
    const targetPreset = config.targetPreset ?? 'main';
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    // try to read the chain definition we are going to use
    const deployInfo = await runtime.loader.readDeploy(config.source, sourcePreset, chainId);
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
    if (ctx.imports[importLabel]) {
      const prevUrl = ctx.imports[importLabel].url;
      debug(`using state from previous deploy: ${prevUrl}`);
      prevState = (await runtime.loader.readMisc(prevUrl))!.state;
    } else {
      // sanity: there shouldn't already be a build in our way
      // if there is, we need to overwrite it. print out a warning.
      if (await runtime.loader.readDeploy(config.source, targetPreset, runtime.chainId)) {
        console.warn(
          'warn: there is a preexisting deployment for this preset/chainId. this build will overwrite. did you mean `import`?'
        );
      }

      debug('no previous state found, deploying from scratch');
    }

    // TODO: needs npm package from the manifest
    const initialCtx = await createInitialContext(def, deployInfo.meta, importPkgOptions);

    // use separate runtime to ensure everything is clear
    const importRuntime = runtime.derive({
      getArtifact: undefined,
    });

    let partialDeploy = false;
    importRuntime.on(Events.SkipDeploy, () => {
      partialDeploy = true;
    });

    // need to import the misc data for the imported package
    debug('load misc');
    await importRuntime.restoreMisc(deployInfo?.miscUrl ?? deployInfo!.miscUrl);

    debug('start build');
    const builtState = await build(importRuntime, def, prevState, initialCtx);
    debug('finish build. is partial:', partialDeploy);

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.loader.putDeploy({
      def: def.toJson(),
      miscUrl: deployInfo?.miscUrl ?? deployInfo!.miscUrl,
      options: importPkgOptions,
      state: builtState,
      meta: deployInfo.meta,
      status: partialDeploy ? 'partial' : 'complete',
    });

    if (!newSubDeployUrl) {
      console.warn('warn: cannot record built state for import nested state');
    } else {
      await runtime.loader.resolver.publish(
        [config.source, ...(config.tags || []).map((t) => config.source.split(':')[1] + ':' + t)],
        `${runtime.chainId}-${targetPreset}`,
        newSubDeployUrl
      );
    }

    return {
      imports: {
        [importLabel]: { url: newSubDeployUrl || '', ...(await getOutputs(importRuntime, def, builtState))! },
      },
    };
  },
};
