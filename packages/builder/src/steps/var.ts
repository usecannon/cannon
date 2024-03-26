import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses } from '../access-recorder';
import { ChainBuilderRuntime } from '../runtime';
import { varSchema } from '../schemas';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from '../types';
import chalk from 'chalk';

const debug = Debug('cannon:builder:var');

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
    for (const c in _.omit(config, 'depends')) {
      config[c] = _.template(config[c])(ctx);
    }

    return config;
  },

  getInputs(config: Config) {
    const accesses: string[] = [];

    for (const c in _.omit(config, 'depends')) {
      accesses.push(...computeTemplateAccesses(config[c]));
    }

    return accesses;
  },

  getOutputs(config: Config, packageState: PackageState) {
    if (packageState.currentLabel.startsWith('setting.')) {
      return [`settings.${packageState.currentLabel.split('.')[1]}`];
    }

    return Object.keys(config)
      .filter((k) => k !== 'depends')
      .map((k) => `settings.${k}`);
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const varLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config);

    // backwards compatibility
    if (packageState.currentLabel.startsWith('setting.')) {
      const value = config.value || config.defaultValue;

      if (!value) {
        console.log(chalk.yellow('At least one of `value` or `defaultValue` must be specified. Skipping...'))
      }

      return {
        settings: {
          [varLabel]: value!,
        },
      };
    } else {
      const settings: { [k: string]: string } = {};

      for (const c in _.omit(config, 'depends')) {
        settings[c] = config[c];
      }

      return { settings };
    }
  },
};

export default varSpec;
