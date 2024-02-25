import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses } from '../access-recorder';
import { ChainBuilderRuntime } from '../runtime';
import { varSchema } from '../schemas';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from '../types';

const debug = Debug('cannon:builder:import');

/**
 *  Available properties for var step
 *  @public
 *  @group Var
 */
export type Config = z.infer<typeof varSchema>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const varSpec = {
  label: 'var',

  validate: varSchema,

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    return [{ value: cfg.value }];
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);
    if (config.value) {
      config.value = _.template(config.value)(ctx);
    }

    if (config.defaultValue) {
      config.defaultValue = _.template(config.defaultValue)(ctx);
    }
    return config;
  },

  getInputs(config: Config) {
    const accesses: string[] = [];

    accesses.push(...computeTemplateAccesses(config.value));

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`settings.${packageState.currentLabel.split('.')[1]}`];
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const varLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config);

    const value = config.value || config.defaultValue;

    if (!value) {
      throw new Error('at least one of `value` or `defaultValue` must be specified');
    }

    return {
      settings: {
        [varLabel]: value,
      },
    };
  },
};

export default varSpec;
