import Debug from 'debug';
import { ethers } from 'ethers';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses } from '../access-recorder';
import { invokeSchema } from '../schemas.zod';
import {
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderContextWithHelpers,
  ChainBuilderRuntimeInfo,
  PackageState,
  TransactionMap,
} from '../types';
import {
  getAllContractPaths,
  getContractDefinitionFromPath,
  getContractFromPath,
  getMergedAbiFromContractPaths,
} from '../util';

const debug = Debug('cannon:builder:invoke');

/**
 *  Available properties for invoke step
 *  @public
 *  @group Invoke
 */
export type Config = z.infer<typeof invokeSchema>;

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

  if (config.fromCall && config.fromCall.func && !contract.functions[config.fromCall.func]) {
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

  // Attempt to encode data so that if any arguments have any type mismatches, we can catch them and present them to the user.
  try {
    contract.interface.encodeFunctionData(config.func, config.args);
  } catch (error: any) {
    throw new Error(`Invalid arguments for function "${config.func}": \n\n ${error}`);
  }

  if (config.fromCall && config.fromCall.func) {
    debug('resolve from address', contract.address);

    const address = await contract.connect(runtime.provider)[config.fromCall.func](...(config.fromCall?.args || []));

    debug('owner for call', address);

    const callSigner = await runtime.getSigner(address);

    debug('owner for call', address);

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

function parseEventOutputs(config: Config['extra'], txnEvents: EncodedTxnEvents[]): { [label: string]: string } {
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
          expectedEvent = config[name].event;
        }

        if (!config[name].allowEmptyEvents) {
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
const invokeSpec = {
  label: 'invoke',

  validate: invokeSchema,

  async getState(_runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    if (typeof cfg.target === 'string') {
      cfg.target = [cfg.target as string];
    }

    return {
      to: cfg.target?.map((t) => getContractFromPath(ctx, t)?.address),
      func: cfg.func,
      args: cfg.args?.map((v) => JSON.stringify(v)),
      value: cfg.value || '0',
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    if (typeof config.target === 'string') {
      config.target = [config.target as string];
    }

    if (config.target) {
      // [string, ...string[]] refers to a nonempty array
      config.target = config.target.map((v) => _.template(v)(ctx)) as [string, ...string[]];
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

  getInputs(config: Config) {
    const accesses: string[] = [];

    for (const target of config.target) {
      if (!ethers.utils.isAddress(target)) {
        if (target.includes('.')) {
          accesses.push(`imports.${target.split('.')[0]}`);
        } else {
          accesses.push(`contracts.${target}`);
        }
      }
    }

    accesses.push(...computeTemplateAccesses(config.abi));
    accesses.push(...computeTemplateAccesses(config.func));
    accesses.push(...computeTemplateAccesses(config.from));
    accesses.push(...computeTemplateAccesses(config.value));

    if (config.args) {
      _.forEach(config.args, (a) => accesses.push(...computeTemplateAccesses(JSON.stringify(a))));
    }

    if (config.fromCall) {
      accesses.push(...computeTemplateAccesses(config.fromCall.func));
      _.forEach(config.fromCall.args, (a) => accesses.push(...computeTemplateAccesses(JSON.stringify(a))));
    }

    if (config?.overrides) {
      accesses.push(...computeTemplateAccesses(config.overrides.gasLimit));
    }

    for (const name in config.factory) {
      const f = config.factory[name];

      accesses.push(...computeTemplateAccesses(f.event));
      accesses.push(...computeTemplateAccesses(f.artifact));
      _.forEach(f.abiOf, (a) => accesses.push(...computeTemplateAccesses(a)));
    }

    for (const name in config.extra) {
      const f = config.extra[name];
      accesses.push(...computeTemplateAccesses(f.event));
    }

    return accesses;
  },

  getOutputs(config: Config, packageState: PackageState) {
    const outputs = [`txns.${packageState.currentLabel.split('.')[1]}`];

    // factories can output contracts, and extras can output extras
    if (config.factory) {
      for (const k in config.factory) {
        if ((config.factory[k].expectCount || 1) > 1) {
          for (let i = 0; i < config.factory[k].expectCount!; i++) {
            outputs.push(`contracts.${k}_${i}`);
          }
        } else {
          outputs.push(`contracts.${k}`);
        }
      }
    }

    if (config.extra) {
      for (const k in config.extra) {
        if ((config.extra[k].expectCount || 1) > 1) {
          for (let i = 0; i < config.extra[k].expectCount!; i++) {
            outputs.push(`extras.${k}_${i}`);
          }
        } else {
          outputs.push(`extras.${k}`);
        }
      }
    }

    return outputs;
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

      debug('get contract for target: ', t);
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
        gasUsed: receipt.gasUsed.toNumber(),
        gasCost: receipt.effectiveGasPrice.toString(),
        signer: receipt.from,
      };
    }

    const contracts: ChainArtifacts['contracts'] = {};

    if (config.factory) {
      for (const [k, contractAddress] of _.entries(parseEventOutputs(config.factory, _.map(txns, 'events')))) {
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
          gasUsed: 0,
          gasCost: '0',
        };

        if (factoryInfo.highlight) {
          contracts[k].highlight = true;
        }
      }
    }

    const extras: ChainArtifacts['extras'] = parseEventOutputs(config.extra, _.map(txns, 'events'));

    return {
      contracts,
      txns,
      extras,
    };
  },
};

export default invokeSpec;
