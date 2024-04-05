import { yellow } from 'chalk';
import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { build, createInitialContext, getOutputs } from '../builder';
import { CANNON_CHAIN_ID } from '../constants';
import { ChainDefinition } from '../definition';
import { PackageReference } from '../package';
import { ChainBuilderRuntime, Events } from '../runtime';
import { cloneSchema } from '../schemas';
import {
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderContextWithHelpers,
  DeploymentState,
  PackageState,
} from '../types';

const debug = Debug('cannon:builder:clone');

/**
 *  Available properties for clone step
 *  @public
 *  @group clone
 */
export type Config = z.infer<typeof cloneSchema>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const cloneSpec = {
  label: 'clone',

  validate: cloneSchema,

  async getState() {
    // Always re-run the step
    return [];
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config, packageState: PackageState) {
    config = _.cloneDeep(config);

    const ref = new PackageReference(_.template(config.source)(ctx));

    config.source = ref.fullPackageRef;

    if (config.sourcePreset) {
      config.source = PackageReference.from(ref.name, ref.version, config.sourcePreset).fullPackageRef;
    }

    config.sourcePreset = _.template(config.sourcePreset)(ctx);
    config.targetPreset = _.template(config.targetPreset)(ctx) || `with-${packageState.name}`;

    if (config.var) {
      config.var = _.mapValues(config.var, (v) => {
        return _.template(v)(ctx);
      });
    } else if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return _.template(v)(ctx);
      });
    }

    if (config.tags) {
      config.tags = config.tags.map((t: string) => _.template(t)(ctx));
    }

    return config;
  },

  getInputs(config: Config) {
    let accesses = computeTemplateAccesses(config.source);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.sourcePreset));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.targetPreset));

    if (config.options) {
      _.forEach(config.options, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a))));
    }

    if (config.tags) {
      _.forEach(config.tags, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a))));
    }

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`imports.${packageState.currentLabel.split('.')[1]}`];
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const importLabel = packageState.currentLabel.split('.')[1] || '';
    debug('exec', config);

    const targetPreset = config.targetPreset ?? 'main';
    const sourcePreset = config.sourcePreset;
    const sourceRef = new PackageReference(config.source);
    const source = sourceRef.fullPackageRef;
    const target = `${sourceRef.name}:${sourceRef.version}@${targetPreset}`;
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    // try to read the chain definition we are going to use
    const deployInfo = await runtime.readDeploy(source, chainId);
    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${source}. please make sure it exists for preset ${
          sourcePreset || sourceRef.preset
        } and network ${chainId}.`
      );
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.var || config.options || {}) };

    debug('cloning package options', importPkgOptions);

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
      if (await runtime.readDeploy(source, runtime.chainId)) {
        debug(
          yellow(
            'There is a pre-existing deployment for this preset and chain id. This build will overwrite. Did you mean `import`?'
          )
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
    if (importRuntime.isCancelled()) {
      partialDeploy = true;
    }

    debug('finish build. is partial:', partialDeploy);

    if (!_.isEmpty(prevState) && _.isEqual(builtState, prevState)) {
      debug('built state is exactly equal to previous state. skip generation of new deploy url');
      return {
        imports: {
          [importLabel]: ctx.imports[importLabel],
        },
      };
    }

    const newMiscUrl = await importRuntime.recordMisc();

    debug('new misc:', newMiscUrl);

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.putDeploy({
      // TODO: add cannon version number?
      generator: 'cannon clone',
      timestamp: Math.floor(Date.now() / 1000),
      def: def.toJson(),
      miscUrl: newMiscUrl || '',
      options: importPkgOptions,
      state: builtState,
      meta: deployInfo.meta,
      status: partialDeploy ? 'partial' : 'complete',
      chainId,
    });

    if (!newSubDeployUrl) {
      debug('warn: cannot record built state for import nested state');
    } else {
      await runtime.registry.publish(
        [target, ...(config.tags || ['latest']).map((t) => config.source.split(':')[0] + ':' + t)],
        runtime.chainId,
        newSubDeployUrl,
        (await runtime.registry.getMetaUrl(source, chainId)) || ''
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

export default cloneSpec;
