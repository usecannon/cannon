import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainBuilderRuntime, ChainArtifacts, TransactionMap } from './types';
import { getContractFromPath } from './util';
import { ethers } from 'ethers';

const debug = Debug('cannon:builder:invoke');

const config = {
  properties: {
    func: { type: 'string' },
  },
  optionalProperties: {
    target: { elements: { type: 'string' } },
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
      values: {
        properties: {
          event: { type: 'string' },
          arg: { type: 'int32' },
          artifact: { type: 'string' },
        },
        optionalProperties: {
          constructorArgs: { elements: {} },
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
  runtime: ChainBuilderRuntime,
  config: Config,
  contract: ethers.Contract,
  signer: ethers.Signer
): Promise<[ethers.ContractReceipt, EncodedTxnEvents]> {
  let txn: ethers.ContractTransaction;

  if (config.fromCall) {
    debug('resolve from address', contract.address);

    const address = await contract.connect(runtime.provider)[config.fromCall.func](...(config.fromCall?.args || []));

    debug('owner for call', address);

    const callSigner = await runtime.getSigner(address);

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

  async getState(_runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config) {
    return this.configInject(ctx, config);
  },

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    if (config.target) {
      config.target = config.target.map((v) => _.template(v)(ctx));
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

    for (const name in config.factory) {
      const f = config.factory[name];

      f.event = _.template(f.event)(ctx);
      f.artifact = _.template(f.artifact)(ctx);
    }

    return config;
  },

  async exec(runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config): Promise<ChainArtifacts> {
    debug('exec', config);

    const txns: TransactionMap = {};

    const mainSigner: ethers.Signer = config.from
      ? await runtime.getSigner(config.from)
      : await runtime.getDefaultSigner({}, '');

    for (const t of config.target || []) {
      let contract: ethers.Contract | null;
      if (ethers.utils.isAddress(t)) {
        if (!config.abi) {
          throw new Error('abi must be defined if addresses is used for target');
        }

        contract = new ethers.Contract(t, JSON.parse(config.abi));
      } else {
        contract = getContractFromPath(ctx, t);
      }

      if (!contract) {
        throw new Error(`field on: contract with identifier '${t}' not found. The valid list of recognized contracts is:`);
      }

      const [receipt, txnEvents] = await runTxn(runtime, config, contract, mainSigner);

      const currentLabel = runtime.currentLabel?.split('.')[1];

      const label = config.target?.length === 1 ? currentLabel || '' : `${currentLabel}_${t}`;

      txns[label] = {
        hash: receipt.transactionHash,
        events: txnEvents,
      };
    }

    const contracts: ChainArtifacts['contracts'] = {};

    if (config.factory) {
      for (const n in txns) {
        for (const [name, factory] of Object.entries(config.factory)) {
          const abi = (await runtime.getArtifact(factory.artifact)).abi;

          const events = _.entries(txns[n].events[factory.event]);
          for (const [i, e] of events) {
            const addr = e.args[factory.arg];

            if (!addr) {
              throw new Error(`address was not resolvable in ${factory.event}. Ensure "arg" parameter is correct`);
            }

            let label = name;

            if ((config.target || []).length > 1) {
              label += '_' + n;
            }

            if (events.length > 1) {
              label += '_' + i;
            }

            contracts[label] = {
              address: addr,
              abi: abi,
              deployTxnHash: txns[n].hash,
              constructorArgs: factory.constructorArgs,
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
