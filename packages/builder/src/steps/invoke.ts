import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainBuilderRuntime, ChainArtifacts, TransactionMap } from '../types';
import { getContractFromPath } from '../util';
import { ethers } from 'ethers';

import { getAllContractPaths } from '../util';

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
        },
        optionalProperties: {
          artifact: { type: 'string' },
          abiOf: { elements: { type: 'string' } },
          constructorArgs: { elements: {} },
        },
      },
    },
    depends: { elements: { type: 'string' } },
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

  // sanity check the contract we are calling has code defined
  // we check here because a missing contract will not revert when provided with data, leading to confusing situations
  // if invoke calls succeeding when no action was actually performed.
  if ((await runtime.provider.getCode(contract.address)) === '0x') {
    throw new Error(
      `contract ${contract.address} for ${runtime.currentLabel} has no bytecode. This is most likely a missing dependency or bad state.`
    );
  }

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
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(_.template(JSON.stringify(a))(ctx));
      });
    }

    if (config.from) {
      config.from = _.template(config.from)(ctx);
    }

    if (config.fromCall) {
      config.fromCall.func = _.template(config.fromCall.func)(ctx);
      config.fromCall.args = _.map(config.fromCall.args, (a) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(_.template(JSON.stringify(a))(ctx));
      });
    }

    for (const name in config.factory) {
      const f = config.factory[name];

      f.event = _.template(f.event)(ctx);

      if (f.artifact) {
        f.artifact = _.template(f.artifact)(ctx);
      }

      if (f.abiOf) {
        f.abiOf = _.map(f.abiOf, (v) => _.template(v)(ctx));
      }
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
        throw new Error(`field "target": contract with name '${t}' not found. The valid list of recognized contracts is:
${getAllContractPaths(ctx).join('\n')}`);
      }

      const [receipt, txnEvents] = await runTxn(runtime, config, contract, mainSigner);

      const currentLabel = runtime.currentLabel?.split('.')[1];

      const label = config.target?.length === 1 ? currentLabel || '' : `${currentLabel}_${t}`;

      txns[label] = {
        hash: receipt.transactionHash,
        events: txnEvents,
        deployedOn: runtime.currentLabel!,
      };
    }

    const contracts: ChainArtifacts['contracts'] = {};

    if (config.factory) {
      for (const n in txns) {
        for (const [name, factory] of Object.entries(config.factory)) {
          let abi: any[];
          let sourceName: string | null;
          let contractName: string;
          if (factory.artifact) {
            const artifact = await runtime.getArtifact(factory.artifact);
            abi = artifact.abi;
            sourceName = artifact.sourceName;
            contractName = artifact.contractName;
          } else if (factory.abiOf) {
            abi = [];
            for (const ofContract of factory.abiOf) {
              const implContract = getContractFromPath(ctx, ofContract);

              if (!implContract) {
                throw new Error(`previously deployed contract with identifier "${ofContract}" for factory not found`);
              }

              abi.push(...JSON.parse(implContract.interface.format(ethers.utils.FormatTypes.json) as string));
            }

            sourceName = ''; // TODO: might cause a problem, might be able to load from the resolved contract itself. update `getContractFromPath`
            contractName = '';
          } else {
            throw new Error(
              `factory "${name}" must specify at least one of "artifact" or "abiOf" to resolve the contract ABI for the created contract`
            );
          }

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
              abi,
              deployTxnHash: txns[n].hash,
              constructorArgs: factory.constructorArgs,
              sourceName: sourceName,
              contractName: contractName,
              deployedOn: runtime.currentLabel!,
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
