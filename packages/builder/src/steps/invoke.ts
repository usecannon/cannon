import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  TransactionMap,
  ChainBuilderContextWithHelpers,
  PackageState,
} from '../types';
import { getContractDefinitionFromPath, getContractFromPath, getMergedAbiFromContractPaths } from '../util';
import { ethers } from 'ethers';

import { getAllContractPaths } from '../util';

const debug = Debug('cannon:builder:invoke');

const config = {
  properties: {
    target: { elements: { type: 'string' } },
    func: { type: 'string' },
  },
  optionalProperties: {
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
    value: { type: 'string' },
    overrides: {
      optionalProperties: {
        gasLimit: { type: 'string' },
      },
    },
    extra: {
      values: {
        properties: {
          event: { type: 'string' },
          arg: { type: 'int32' },
        },
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
    allowEmptyFactory: { type: 'boolean' }, 
  },
} as const;

export type Config = JTDDataType<typeof config>;

export type EncodedTxnEvents = { [name: string]: { args: any[] }[] };

export interface InvokeOutputs {
  hashes: string[];
  events?: EncodedTxnEvents[];
}

async function runTxn(
  runtime: ChainBuilderRuntimeInfo,
  config: Config,
  contract: ethers.Contract,
  signer: ethers.Signer,
  packageState: PackageState
): Promise<[ethers.ContractReceipt, EncodedTxnEvents]> {
  let txn: ethers.ContractTransaction;

  // sanity check the contract we are calling has code defined
  // we check here because a missing contract will not revert when provided with data, leading to confusing situations
  // if invoke calls succeeding when no action was actually performed.
  if ((await runtime.provider.getCode(contract.address)) === '0x') {
    throw new Error(
      `contract ${contract.address} for ${packageState.currentLabel} has no bytecode. This is most likely a missing dependency or bad state.`
    );
  }

  if (!contract.functions[config.func]) {
    throw new Error(
      `contract ${contract.address} for ${packageState.currentLabel} does not contain the function "${
        config.func
      }". List of recognized functions is:\n${Object.keys(contract.functions).join(
        '\n'
      )}\n\nIf this is a proxy contract, make sure you’ve specified abiOf for the contract action in the cannonfile that deploys it. If you’re calling an overloaded function, update func to include parentheses.`
    );
  }

  if (config.fromCall && !contract.functions[config.fromCall.func]) {
    throw new Error(
      `contract ${contract.address} for ${packageState.currentLabel} does not contain the function "${
        config.func
      }" to determine owner. List of recognized functions is:\n${Object.keys(contract.functions).join(
        '\n'
      )}\n\nIf this is a proxy contract, make sure you’ve specified abiOf for the contract action in the cannonfile that deploys it.`
    );
  }

  const overrides: ethers.Overrides & { value?: string } = {};

  if (config.overrides?.gasLimit) {
    overrides.gasLimit = config.overrides.gasLimit;
  }

  if (config.value) {
    overrides.value = config.value;
  }

  if (runtime.gasPrice) {
    overrides.gasPrice = runtime.gasPrice;
  }

  if (runtime.gasFee) {
    overrides.maxFeePerGas = runtime.gasFee;
  }

  if (runtime.priorityGasFee) {
    overrides.maxPriorityFeePerGas = runtime.priorityGasFee;
  }

  if (config.fromCall) {
    debug('resolve from address', contract.address);

    const address = await contract.connect(runtime.provider)[config.fromCall.func](...(config.fromCall?.args || []));

    debug('owner for call', address);

    const callSigner = await runtime.getSigner(address);

    txn = await contract.connect(callSigner)[config.func](...(config.args || []), overrides);
  } else {
    txn = await contract.connect(signer)[config.func](...(config.args || []), overrides);
  }

  const receipt = await txn.wait();

  debug('got receipt', receipt);

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

function parseEventOutputs(
  config: Config['extra'],
  txnEvents: EncodedTxnEvents[],
  allowEmptyFactory: Config['allowEmptyFactory']
): { [label: string]: string } {
  const vals: { [label: string]: string } = {};
  let expectedEvent = '';

  if (config) {
    for (const n in txnEvents) {
      for (const [name, extra] of Object.entries(config)) {
        const events = _.entries(txnEvents[n][extra.event]);

        // Check for an event defined in the cannonfile
        if (
          Object.prototype.hasOwnProperty.call(config, name) &&
          Object.prototype.hasOwnProperty.call(config[name], 'event')
        ) {
          expectedEvent = config[`${name}`].event;
        }

        if (!allowEmptyFactory) {
          if (events.length === 0) {
            throw new Error(
              `Event specified in cannonfile:\n\n ${expectedEvent} \n\ndoesn't exist or match an event emitted by the invoked function of the contract.`
            );
          }
        }

        for (const [i, e] of events) {
          let label = name;

          if (txnEvents.length > 1) {
            label += '_' + n;
          }

          if (events.length > 1) {
            label += '_' + i;
          }

          const v = e.args[extra.arg];

          vals[label] = v.toString ? v.toString() : v;
        }
      }
    }
  }

  return vals;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  label: 'invoke',

  validate: config,

  async getState(_runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    return {
      to: cfg.target?.map((t) => getContractFromPath(ctx, t)?.address),
      func: cfg.func,
      args: cfg.args?.map((v) => JSON.stringify(v)),
      value: cfg.value || '0',
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
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

    if (config.value) {
      config.value = _.template(config.value)(ctx);
    }

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = _.template(config.overrides.gasLimit)(ctx);
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

    for (const name in config.extra) {
      const f = config.extra[name];
      f.event = _.template(f.event)(ctx);
    }

    return config;
  },

  async exec(
    runtime: ChainBuilderRuntimeInfo,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    debug('exec', config);

    const txns: TransactionMap = {};

    const mainSigner: ethers.Signer = config.from
      ? await runtime.getSigner(config.from)
      : await runtime.getDefaultSigner!({}, '');

    const customAbi =
      typeof config.abi === 'string'
        ? config.abi.startsWith('[')
          ? JSON.parse(config.abi)
          : getContractDefinitionFromPath(ctx, config.abi)?.abi
        : null;

    for (const t of config.target || []) {
      let contract: ethers.Contract | null;

      if (ethers.utils.isAddress(t)) {
        if (!customAbi) {
          throw new Error('abi must be defined if addresses is used for target');
        }

        contract = new ethers.Contract(t, customAbi);
      } else {
        contract = getContractFromPath(ctx, t, customAbi);
      }

      if (!contract) {
        throw new Error(`field "target": contract with name '${t}' not found. The valid list of recognized contracts is:
${getAllContractPaths(ctx).join('\n')}`);
      }

      const [receipt, txnEvents] = await runTxn(runtime, config, contract, mainSigner, packageState);

      const splitLabel = packageState.currentLabel.split('.')[1];

      const label = config.target?.length === 1 ? splitLabel || '' : `${splitLabel}_${t}`;

      debug('ran txn', label);
      debug('got events', txnEvents);

      txns[label] = {
        hash: receipt.transactionHash,
        events: txnEvents,
        deployedOn: packageState.currentLabel,
      };
    }

    const contracts: ChainArtifacts['contracts'] = {};

    if (config.factory) {
      for (const [k, contractAddress] of _.entries(
        parseEventOutputs(config.factory, _.map(txns, 'events'), config.allowEmptyFactory)
      )) {
        const topLabel = k.split('_')[0];
        const factoryInfo = config.factory[topLabel];

        if (!contractAddress || !ethers.utils.isAddress(contractAddress)) {
          throw new Error(`address is not valid in ${topLabel}. Ensure "arg" parameter is correct`);
        }

        let abi: any[];
        let sourceName: string | null;
        let contractName: string;
        if (factoryInfo.artifact) {
          const artifact = await runtime.getArtifact!(factoryInfo.artifact);
          abi = artifact.abi;
          sourceName = artifact.sourceName;
          contractName = artifact.contractName;
        } else if (factoryInfo.abiOf) {
          abi = getMergedAbiFromContractPaths(ctx, factoryInfo.abiOf);

          sourceName = ''; // TODO: might cause a problem, might be able to load from the resolved contract itself. update `getContractFromPath`
          contractName = '';
        } else {
          throw new Error(
            `factory."${topLabel}": must specify at least one of "artifact" or "abiOf" to resolve the contract ABI for the created contract`
          );
        }

        contracts[k] = {
          address: contractAddress,
          abi,
          //deployTxnHash: txns[0].hash, // TODO: find the hash for the actual txn we are reading?
          deployTxnHash: '',
          constructorArgs: factoryInfo.constructorArgs,
          sourceName: sourceName,
          contractName: contractName,
          deployedOn: packageState.currentLabel,
        };
      }
    }

    const extras: ChainArtifacts['extras'] = parseEventOutputs(config.extra, _.map(txns, 'events'), config.allowEmptyFactory);
    
    return {
      contracts,
      txns,
      extras,
    };
  },
};
