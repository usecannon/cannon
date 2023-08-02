import _ from 'lodash';

import { z } from 'zod';

import { ChainArtifacts, ChainBuilderContext, ChainBuilderRuntimeInfo } from '../types';

/**
 *  Available properties for keeper step (Not yet implemented)
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

  async getState(_runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContext, config: Config) {
    return this.configInject(ctx, config);
  },

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.exec = _.template(config.exec)(ctx);

    if (config.args) {
      config.args = _.map(config.args, (v) => {
        return _.template(v)(ctx);
      });
    }

    if (config.env) {
      config.env = _.map(config.env, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exec(_runtime: ChainBuilderRuntimeInfo, _ctx: ChainBuilderContext, _config: Config): Promise<ChainArtifacts> {
    return {};
  },
};
