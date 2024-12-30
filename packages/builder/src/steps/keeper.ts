import _ from 'lodash';
import { z } from 'zod';
import { template } from '../utils/template';
import { CannonAction } from '../actions';

/**
 *  Available properties for keeper operation (Not yet implemented)
 *  @internal
 *  @group Keeper
 */
export const keeperSchema = z
  .object({
    exec: z.string(),
  })
  .merge(
    z
      .object({
        args: z.array(z.string()),
        env: z.array(z.string()),
      })
      .deepPartial()
  );

export type Config = z.infer<typeof keeperSchema>;

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  label: 'keeper',

  validate: keeperSchema,

  async getState(_runtime, ctx, config, packageState) {
    return [this.configInject(ctx, config, packageState)];
  },

  configInject(ctx, config) {
    config = _.cloneDeep(config);

    config.exec = template(config.exec)(ctx);

    if (config.args) {
      config.args = _.map(config.args, (v) => {
        return template(v)(ctx);
      });
    }

    if (config.env) {
      config.env = _.map(config.env, (v) => {
        return template(v)(ctx);
      });
    }

    return config;
  },

  async exec() {
    return {};
  },
} satisfies CannonAction<Config>;
