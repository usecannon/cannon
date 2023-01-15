import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainArtifacts, ChainBuilderContextWithHelpers, DeploymentState } from '../types';
import { build, createInitialContext, getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime } from '../runtime';
import { CANNON_CHAIN_ID } from '../constants';

const debug = Debug('cannon:builder:provision');

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

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    const url = await runtime.loader.resolver.getUrl(cfg.source, `${chainId}-${preset}`);

    return {
      url,
      options: cfg.options,
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

    // try to read the chain definition we are going to use
    const deployInfo = await runtime.loader.readDeploy(config.source, preset, chainId);
    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${config.source}. please make sure it exists for preset ${preset} and network ${chainId}.`
      );
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.options || {}) };

    debug('provisioning package options', importPkgOptions);

    const def = new ChainDefinition(deployInfo.def);

    // always treat upstream state as what is used if its available. otherwise, we might have a state from a previous upgrade.
    // if all else fails, we can load from scratch (aka this is first deployment)
    let prevState: DeploymentState = {};
    if (ctx.imports[importLabel]) {
      debug('using state from upstream source');
      prevState = (await runtime.loader.readDeploy(config.source, preset, chainId))!.state;
    } else {
      debug('no previous state found, deploying from scratch');
    }

    // TODO: needs npm package from the manifest
    const initialCtx = await createInitialContext(def, {}, importPkgOptions);

    // use separate runtime to ensure everything is clear
    const importRuntime = runtime.derive({
      getArtifact: undefined,
    });

    // need to import the misc data for the imported package
    debug('load misc');
    await importRuntime.restoreMisc(deployInfo?.miscUrl ?? deployInfo!.miscUrl);

    debug('start build');
    const builtState = await build(importRuntime, def, prevState, initialCtx);
    debug('finish build');

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.loader.putDeploy({
      def: def.toJson(),
      miscUrl: deployInfo?.miscUrl ?? deployInfo!.miscUrl,
      options: importPkgOptions,
      state: builtState,
    });

    if (!newSubDeployUrl) {
      console.warn('warn: cannot record built state for import nested state');
    } else {
      await runtime.loader.resolver.publish(
        [config.source.split(':')[1], ...(config.tags || [])],
        newSubDeployUrl,
        `${runtime.chainId}-${preset}`
      );
    }

    return {
      imports: {
        [importLabel]: { url: newSubDeployUrl || '', ...(await getOutputs(importRuntime, def, builtState))! },
      },
    };
  },
};
