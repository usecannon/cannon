import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, InternalOutputs } from './types';
import { ChainBuilder } from '.';

const debug = Debug('cannon:builder:import');

const config = {
  properties: {
    source: { type: 'string' },
  },
  optionalProperties: {
    options: {
      values: { type: 'string' },
    },
    step: { type: 'int32' },
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

  async getState(
    _: HardhatRuntimeEnvironment,
    ctx: ChainBuilderContext,
    config: Config,
    // Leaving storage param for future usage
    storage: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.configInject(ctx, config);
  },

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

  async exec(hre: HardhatRuntimeEnvironment, _ctx: ChainBuilderContext, config: Config): Promise<InternalOutputs> {
    debug('exec', config);

    // download if necessary upstream
    // then provision a builder and build the cannonfile
    const [name, version] = config.source.split(':');
    const builder = new ChainBuilder({ name, version, hre });

    await builder.build(config.options || {});

    const outputs = builder.getOutputs();

    return {
      contracts: outputs.contracts,
      imports: outputs.imports,
    };
  },
};
