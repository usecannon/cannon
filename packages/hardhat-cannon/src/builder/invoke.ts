import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext } from './';
import { getExecutionSigner, initializeSigner } from './util';
import { ethers } from 'ethers';

const debug = Debug('cannon:builder:invoke');

const config = {
  properties: {
    addresses: { elements: { type: 'string' } },
    abi: { type: 'string' },
    func: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: {} },
    from: { type: 'string' },
    fromCall: {
      properties: {
        func: { type: 'string' },
      },
      optionalProperties: {
        args: { elements: {} },
      },
    },
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

export type EncodedTxnEvents = { [name: string]: { args: any[] }[] };

export interface Outputs {
  hashes: string[];
  events?: EncodedTxnEvents[];
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

    config.addresses = config.addresses.map((a) => _.template(a)(ctx));
    config.abi = _.template(config.abi)(ctx);
    config.func = _.template(config.func)(ctx);

    if (config.args) {
      config.args = _.map(config.args, (a) => {
        return typeof a == 'string' ? _.template(a)(ctx) : a;
      });
    }

    if (config.from) {
      config.from = _.template(config.from)(ctx);
    }

    if (config.fromCall) {
      config.fromCall.func = _.template(config.fromCall.func)(ctx);
      config.fromCall.args = _.map(config.fromCall.args, (a) => {
        return typeof a == 'string' ? _.template(a)(ctx) : a;
      });
    }

    return config;
  },

  async exec(hre: HardhatRuntimeEnvironment, config: Config): Promise<Outputs> {
    debug('exec', config);

    const hashes = [];
    const events: EncodedTxnEvents[] = [];

    const mainSigner = config.from ? await initializeSigner(hre, config.from) : await getExecutionSigner(hre, '');

    for (const address of config.addresses) {
      const contract = new hre.ethers.Contract(address, JSON.parse(config.abi));

      let txn: ethers.ContractTransaction;

      if (config.fromCall) {
        debug('resolve from address', contract.address);

        const address = await contract.connect(hre.ethers.provider)[config.fromCall.func](...(config.fromCall?.args || []));

        debug('owner for call', address);

        const callSigner = await initializeSigner(hre, address);

        txn = await contract.connect(callSigner)[config.func](...(config.args || []));
      } else {
        txn = await contract.connect(mainSigner)[config.func](...(config.args || []));
      }

      const receipt = await txn.wait();

      // get events
      const txnEvents = _.groupBy(
        _.filter(
          receipt.events?.map((e) => {
            if (!e.event || !e.args) {
              return null;
            }

            return {
              name: e.event,
              args: e.args as any[],
            };
          }),
          _.isObject
        ),
        'name'
      );

      hashes.push(receipt.transactionHash);
      events.push(txnEvents as EncodedTxnEvents);
    }

    return {
      hashes,
      events,
    };
  },
};
