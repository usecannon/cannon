import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { varSchema } from '../schemas';
import { template } from '../utils/template';
import { CannonAction } from '../actions';

const debug = Debug('cannon:builder:var');

/**
 *  Available properties for var operation
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

  async getState(runtime, ctx, config, packageState) {
    const cfg = this.configInject(ctx, config, packageState);

    return [_.omit(cfg, 'depends')];
  },

  configInject(ctx, config) {
    config = _.cloneDeep(config);
    for (const c in _.omit(config, 'depends')) {
      config[c] = template(config[c], ctx);
    }

    return config;
  },

  getInputs(config, possibleFields) {
    let accesses = computeTemplateAccesses('', possibleFields);

    for (const c in _.omit(config, 'depends')) {
      const fields = computeTemplateAccesses(config[c], possibleFields);
      accesses = mergeTemplateAccesses(accesses, fields);
    }

    return accesses;
  },

  getOutputs(config, packageState) {
    if (packageState.currentLabel.startsWith('setting.')) {
      return [`settings.${packageState.currentLabel.split('.')[1]}`];
    }

    return Object.keys(config)
      .filter((k) => k !== 'depends')
      .map((k) => `settings.${k}`);
  },

  async exec(runtime, ctx, config, packageState) {
    const varLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config, ctx);

    // backwards compatibility
    if (packageState.currentLabel.startsWith('setting.')) {
      const stepName = packageState.currentLabel.split('.')[1];
      let value = config.value || config.defaultValue || ctx.overrideSettings[stepName];

      if (!value) {
        value = '';
      }

      return {
        settings: {
          [varLabel]: value,
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
} satisfies CannonAction<Config>;

export default varSpec;
