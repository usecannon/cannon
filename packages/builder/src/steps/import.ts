import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  DeploymentInfo,
  ChainBuilderContextWithHelpers,
  DeploymentState,
} from '../types';
import { build, createInitialContext, getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime } from '../runtime';
import { CANNON_CHAIN_ID } from '../constants';

const debug = Debug('cannon:builder:import');

const config = {
  properties: {
    source: { type: 'string' },
  },
  optionalProperties: {
    chainId: { type: 'int32' },
    preset: { type: 'string' },
    options: {
      values: { type: 'string' },
    },
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

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {

    const cfg = this.configInject(ctx, config);

    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? runtime.chainId;

    const url = 
      await runtime.loader.resolver.getUrl(cfg.source, `${chainId}-${preset}`) ||
      await runtime.loader.resolver.getUrl(cfg.source, `13370-main`);

    return {
      url,
      options: cfg.options
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);
    config.preset = _.template(config.preset)(ctx) || 'main';

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

    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? runtime.chainId;

    // try to load the chain definition specific to this chain
    // otherwise, load the top level definition
    const deployInfo = await runtime.loader.readDeploy(config.source, preset, chainId);

    let deployCannonNetInfo: DeploymentInfo | null = null;
    if (!deployInfo) {
      debug('old deployment data not found for package, trying to get definition');
      deployCannonNetInfo = await runtime.loader.readDeploy(config.source, 'main', CANNON_CHAIN_ID);

      if (!deployCannonNetInfo) {
        throw new Error(
          `deployment not found: ${config.source}. please make sure it exists for the cannon network and main preset.`
        );
      }
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.options || {}) };

    debug('imported package options', importPkgOptions);

    const def = new ChainDefinition(deployInfo?.def ?? deployCannonNetInfo!.def);

    // always treat upstream state as what is used if its available. otherwise, we might have a state from a previous upgrade.
    // if all else fails, we can load from scratch (aka this is first deployment)
    let prevState: DeploymentState = {};
    if (deployInfo?.state) {
      debug('using state from upstream source');
      prevState = deployInfo.state;
    } else if (ctx.imports[importLabel].url) {
      debug('')
      // TODO: this exposes a bad mismatch in capabilities for the loader. shouldnt have to work around this and read misc
      prevState = await runtime.loader.readMisc(ctx.imports[importLabel].url);
    }

    // TODO: needs npm package from the manifest
    const initialCtx = await createInitialContext(def, {}, importPkgOptions);

    // use separate runtime to ensure everything is clear
    const importRuntime = runtime.derive({
      getArtifact: undefined,
    });

    // need to import the misc data for the imported package
    debug('restore misc');
    await importRuntime.restoreMisc(deployInfo?.miscUrl ?? deployCannonNetInfo!.miscUrl);

    debug('start build');
    const builtState = await build(importRuntime, def, prevState, initialCtx);
    debug('finish build');

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.loader.putDeploy({
      def: def.toJson(),
      miscUrl: deployInfo?.miscUrl ?? deployCannonNetInfo!.miscUrl,
      options: importPkgOptions,
      state: builtState
    });

    if (!newSubDeployUrl) {
      console.warn('warn: cannot record built state for import nested state');
    }

    return {
      imports: {
        [importLabel]: { url: newSubDeployUrl || '', ...(await getOutputs(importRuntime, def, builtState))! }
      }
    };
  },
};
