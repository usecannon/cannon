import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  DeploymentInfo,
  ChainBuilderContextWithHelpers,
} from '../types';
import { build, createInitialContext, getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime } from '../runtime';

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

    const url = await runtime.loader.resolver.getUrl(cfg.source, `${chainId}-${preset}`);

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
    _ctx: ChainBuilderContext,
    config: Config,
    currentLabel: string
  ): Promise<ChainArtifacts> {
    debug('exec', config);

    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? runtime.chainId;

    // try to load the chain definition specific to this chain
    // otherwise, load the top level definition
    const deployInfo = await runtime.loader.readDeploy(config.source, preset, chainId);

    let deployCannonNetInfo: DeploymentInfo | null = null;
    if (!deployInfo) {
      debug('old deployment data not found for package, trying to get definition');
      deployCannonNetInfo = await runtime.loader.readDeploy(config.source, 'main', 13370);

      if (!deployCannonNetInfo) {
        throw new Error(
          `deployment not found: ${config.source}. please make sure it exists for the cannon network and main preset.`
        );
      }
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.options || {}) };

    debug('imported package options', importPkgOptions);

    const def = new ChainDefinition(deployInfo?.def ?? deployCannonNetInfo!.def);

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
    const builtState = await build(importRuntime, def, deployInfo?.state ?? {}, initialCtx);
    debug('finish build');

    return {
      imports: {
        [currentLabel?.split('.')[1] || '']: (await getOutputs(importRuntime, def, builtState))!
      }
    };
  },
};
