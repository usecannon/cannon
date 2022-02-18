import { JTDDataType } from 'ajv/dist/core';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import {
  BundledChainBuilderOutputs,
  ChainBuilder,
  ChainBuilderContext,
  ChainBuilderOutputs,
} from './';

import Debug from 'debug';
const debug = Debug('cannon:builder:import');

const config = {
  properties: {
    source: { type: 'string' },
  },
  optionalProperties: {
    options: {
      values: { type: 'string' },,
    },
    step: { type: 'int32' },,
  },,
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

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);

    if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  async exec(
    hre: HardhatRuntimeEnvironment,
    config: Config
  ): Promise<BundledChainBuilderOutputs> {
    debug('exec', config);

    // download if necessary upstream
    // then provision a builder and build the cannonfile
    const builder = new ChainBuilder(config.source, hre);

    await builder.build(config.options || {});

    return builder.getOutputs();
  },,
};
