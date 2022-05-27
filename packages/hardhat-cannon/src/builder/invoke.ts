import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, InternalOutputs, TransactionMap } from './types';
import { getContractFromPath, getExecutionSigner, initializeSigner } from './util';
import { ethers } from 'ethers';

const debug = Debug('cannon:builder:invoke');

const config = {
  properties: {
    func: { type: 'string' },
  },
  optionalProperties: {
    on: { elements: { type: 'string' } },
    addresses: { elements: { type: 'string' } },
    abi: { type: 'string' },

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
    factory: {
      elements: {
        properties: {
          name: { type: 'string' },
          event: { type: 'string' },
          arg: { type: 'int32' },
          artifact: { type: 'string' },
        },
      },
    },
    step: { type: 'int32' },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export type EncodedTxnEvents = { [name: string]: { args: any[] }[] };

export interface InvokeOutputs {
  hashes: string[];
  events?: EncodedTxnEvents[];
}

async function runTxn(
  hre: HardhatRuntimeEnvironment,
  config: Config,
  contract: ethers.Contract,
  signer: ethers.Signer
): Promise<[ethers.ContractReceipt, EncodedTxnEvents]> {
  let txn: ethers.ContractTransaction;

  if (config.fromCall) {
    debug('resolve from address', contract.address);

    const address = await contract.connect(hre.ethers.provider)[config.fromCall.func](...(config.fromCall?.args || []));

    debug('owner for call', address);

    const callSigner = await initializeSigner(hre, address);

    txn = await contract.connect(callSigner)[config.func](...(config.args || []));
  } else {
    txn = await contract.connect(signer)[config.func](...(config.args || []));
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

  return [receipt, txnEvents as EncodedTxnEvents];
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

    if (config.on) {
      config.on = config.on.map((a) => _.template(a)(ctx));
    }

    if (config.addresses) {
      config.addresses = config.addresses.map((a) => _.template(a)(ctx));
    }

    if (config.abi) {
      config.abi = _.template(config.abi)(ctx);
    }

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

    if (config.factory) {
      config.factory = config.factory.map((f) => {
        return {
          name: _.template(f.name)(ctx),
          event: _.template(f.event)(ctx),
          arg: f.arg, //_.template(f.arg)(ctx),
          artifact: _.template(f.artifact)(ctx),
        };
      });
    }

    return config;
  },

  async exec(
    hre: HardhatRuntimeEnvironment,
    ctx: ChainBuilderContext,
    config: Config,
    _storage: string,
    selfLabel: string
  ): Promise<InternalOutputs> {
    debug('exec', config);

    const txns: TransactionMap = {};

    const mainSigner = config.from ? await initializeSigner(hre, config.from) : await getExecutionSigner(hre, '', ctx.fork);

    for (const contractOn of config.on || []) {
      const contract = getContractFromPath(ctx, contractOn);

      if (!contract) {
        throw new Error(`field on: contract at path ${contractOn} not found. Please double check input and try again!`);
      }

      const [receipt, txnEvents] = await runTxn(hre, config, contract, mainSigner);

      txns[`${selfLabel}_${contractOn}`] = {
        hash: receipt.transactionHash,
        events: txnEvents,
      };
    }

    for (const address of config.addresses || []) {
      if (!config.abi) {
        throw new Error('abi must be defined if addresses is defined');
      }

      const contract = new hre.ethers.Contract(address, JSON.parse(config.abi));

      const [receipt, txnEvents] = await runTxn(hre, config, contract, mainSigner);

      txns[`${selfLabel}_${address}`] = {
        hash: receipt.transactionHash,
        events: txnEvents,
      };
    }

    const contracts: InternalOutputs['contracts'] = {};

    if (config.factory) {
      for (const n in txns) {
        for (const factory of config.factory) {
          const abi = (await hre.artifacts.readArtifact(factory.artifact)).abi;

          for (const [i, e] of _.entries(txns[n].events[factory.event])) {
            const addr = e.args[factory.arg];

            if (!addr) {
              throw new Error(`address was not resolvable in ${factory.event}. Ensure "arg" parameter is correct`);
            }

            contracts[`${factory.name}_${n}_${i}`] = {
              address: addr,
              abi: abi,
              deployTxnHash: txns[n].hash,
            };
          }
        }
      }
    }

    return {
      contracts,
      txns,
    };
  },
};
