import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext } from './';
import { getExecutionSigner } from './util';

const debug = Debug('cannon:builder:invoke');

const config = {
  properties: {
    address: { type: 'string' },
    abi: { type: 'string' },
    func: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: {} },
    from: { type: 'string' },
    detect: {
      properties: {
        func: { type: 'string' },
        value: { type: 'string' },
      },
      optionalProperties: {
        args: { elements: {} },
      },
    },
    step: { type: 'int32' },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface Outputs {
  hash: string;
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

    config.address = _.template(config.address)(ctx);
    config.abi = _.template(config.abi)(ctx);
    config.func = _.template(config.func)(ctx);

    if (config.args) {
      config.args = _.map(config.args, (a) => {
        return typeof a == 'string' ? _.template(a)(ctx) : a;
      });
    }

    return config;
  },

  async exec(hre: HardhatRuntimeEnvironment, config: Config): Promise<Outputs> {
    debug('exec', config);

    const signer = await getExecutionSigner(hre, '');

    const contract = new hre.ethers.Contract(config.address, JSON.parse(config.abi), signer);

    const txn = await contract[config.func](...(config.args || []));
    const receipt = await txn.wait();

    return {
      hash: receipt.transactionHash,
    };
  },
};
