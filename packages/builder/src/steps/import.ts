import _ from 'lodash';
import Debug from 'debug';

import { z } from 'zod';
import { importSchema } from '../schemas.zod';

import { ChainBuilderContext, ChainArtifacts, ChainBuilderContextWithHelpers, PackageState } from '../types';
import { getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { ChainBuilderRuntime } from '../runtime';
import { computeTemplateAccesses } from '../access-recorder';

const debug = Debug('cannon:builder:import');

/**
 *  Available properties for import step
 *  @public
 *  @group Import
 */
export type Config = z.infer<typeof importSchema>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const importSpec = {
  label: 'import',

  validate: importSchema,

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? runtime.chainId;

    debug('resolved pkg', cfg.source, `${chainId}-${preset}`);
    const url = await runtime.registry.getUrl(cfg.source, `${chainId}-${preset}`);

    return {
      url,
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);
    config.preset = _.template(config.preset)(ctx) || 'main';

    return config;
  },

  getInputs(config: Config) {
    const accesses: string[] = [];

    accesses.push(...computeTemplateAccesses(config.source));
    accesses.push(...computeTemplateAccesses(config.preset));

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
    const importLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config);

    const packageRef = config.source.includes(':') ? config.source : `${config.source}:latest`;
    const preset = config.preset ?? 'main';
    const chainId = config.chainId ?? runtime.chainId;

    // try to load the chain definition specific to this chain
    // otherwise, load the top level definition
    const deployInfo = await runtime.readDeploy(packageRef, preset, chainId);

    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${packageRef}. please make sure it exists for the cannon network and ${preset} preset.`
      );
    }

    if (deployInfo.status === 'partial') {
      throw new Error(
        `deployment status is incomplete for ${packageRef}. cannot generate artifacts safely. please complete deployment to continue import.`
      );
    }

    return {
      imports: {
        [importLabel]: {
          url: (await runtime.registry.getUrl(packageRef, `${chainId}-${preset}`))!, // todo: duplication
          ...(await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state))!,
        },
      },
    };
  },
};

export default importSpec;
