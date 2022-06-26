import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainBuilderRuntime, ChainArtifacts } from './types';
import { ChainBuilder } from './builder';

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

  async getState(_runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config) {
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

  async exec(runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config): Promise<ChainArtifacts> {
    debug('exec', config);

    // download if necessary upstream
    // then provision a builder and build the cannonfile
    const [name, version] = config.source.split(':');
    const builder = new ChainBuilder({
      name,
      version,
      ...runtime,
      writeMode: 'none',
    });

    await builder.build(config.options || {});

    const outputs = await builder.getOutputs();

    if (!outputs) {
      // shouldn't be able to happen
      throw new Error('no chain outputs immediately after build');
    }

    return {
      contracts: outputs.contracts,
      txns: outputs.txns,
      imports: outputs.imports,
    };
  },
};
