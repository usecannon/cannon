import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { invokeSchema } from '../schemas';
import {
  CannonSigner,
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderContextWithHelpers,
  ChainBuilderRuntimeInfo,
  Contract,
  PackageState,
  TransactionMap,
} from '../types';
import {
  encodeFunctionData,
  getAllContractPaths,
  getContractDefinitionFromPath,
  getContractFromPath,
  getMergedAbiFromContractPaths,
} from '../util';
import { getTemplateMatches, isTemplateString, template } from '../utils/template';
import { isStepPath, isStepName } from '../utils/matchers';
import { CannonAction } from '../actions';

const debug = Debug('cannon:builder:invoke');

/**
 *  Available properties for invoke operation
 *  @public
 *  @group Invoke
 */
export type Config = z.infer<typeof invokeSchema>;

export type EncodedTxnEvents = { [name: string]: { args: any[] }[] };

export interface InvokeOutputs {
  hashes: string[];
  events?: EncodedTxnEvents[];
}

export function formatAbiFunction(v: viem.AbiFunction) {
  return `${v.name}(${v.inputs.map((i) => i.type).join(',')})`;
}

// we need this function because viem does not seem to have the ability to distinguish between overloaded functions the way ethers can
function assembleFunctionSignatures(abi: viem.Abi): [viem.AbiFunction, string][] {
  const abiFunctions = abi.filter((v) => v.type === 'function') as viem.AbiFunction[];

  const prettyNames = abiFunctions.map(formatAbiFunction) as string[];

  // type detection is bad here
  return _.zip(abiFunctions, prettyNames) as any;
}

async function runTxn(
  runtime: ChainBuilderRuntimeInfo,
  config: Config,
  contract: Contract,
  signer: CannonSigner,
  packageState: PackageState
): Promise<[viem.TransactionReceipt, EncodedTxnEvents]> {
  let txn: viem.Hash;

  // sanity check the contract we are calling has code defined
  // we check here because a missing contract will not revert when provided with data, leading to confusing situations
  // if invoke calls succeeding when no action was actually performed.
  if ((await runtime.provider.getCode({ address: contract.address })) === '0x') {
    throw new Error(
      `contract ${contract.address} for ${packageState.currentLabel} has no bytecode. This is most likely a missing dependency or bad state.`
    );
  }

  const overrides: any = {};

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
  const functionList = assembleFunctionSignatures(contract.abi);
  const neededFuncAbi = functionList.find(
    (f) => config.func == f[1] || config.func == f[1].split('(')[0]
  )?.[0] as viem.AbiFunction;
  if (!neededFuncAbi) {
    throw new Error(
      `contract ${contract.address} for ${packageState.currentLabel} does not contain the function "${
        config.func
      }". List of recognized functions is:\n${functionList
        .map((v) => v[1])
        .join(
          '\n'
        )}\n\nIf this is a proxy contract, make sure you’ve specified abiOf for the contract action in the cannonfile that deploys it. If you’re calling an overloaded function, update func to include parentheses.`
    );
  }

  if (config.fromCall && config.fromCall.func) {
    debug('resolve from address', contract.address);

    const neededOwnerFuncAbi = functionList.find(
      (f) => config.fromCall!.func == f[1] || config.fromCall!.func == f[1].split('(')[0]
    )?.[0] as viem.AbiFunction;
    if (!neededOwnerFuncAbi) {
      throw new Error(
        `contract ${contract.address} for ${packageState.currentLabel} does not contain the function "${
          config.fromCall.func
        }" to determine owner. List of recognized functions is:\n${Object.keys(
          contract.abi.filter((v) => v.type === 'function').map((v) => (v as viem.AbiFunction).name)
        ).join(
          '\n'
        )}\n\nIf this is a proxy contract, make sure you’ve specified abiOf for the contract action in the cannonfile that deploys it.`
      );
    }
    const addressCall = await runtime.provider.simulateContract({
      address: contract.address,
      abi: [neededOwnerFuncAbi],
      functionName: neededOwnerFuncAbi.name,
      args: config.fromCall.args,
    });

    const address = addressCall.result as viem.Address;

    debug('owner for call', address);

    const callSigner = await runtime.getSigner(address);

    const preparedTxn = await runtime.provider.prepareTransactionRequest({
      account: callSigner.wallet.account || callSigner.address,
      to: contract.address,
      data: encodeFunctionData({ abi: [neededFuncAbi], functionName: neededFuncAbi.name, args: config.args }),
      value: config.value,
      ...overrides,
    });
    txn = await callSigner.wallet.sendTransaction(preparedTxn as any);
  } else {
    const preparedTxn = await runtime.provider.prepareTransactionRequest({
      account: signer.wallet.account || signer.address,
      to: contract.address,
      data: encodeFunctionData({ abi: [neededFuncAbi], functionName: neededFuncAbi.name, args: config.args }),
      value: config.value,
      ...overrides,
    });
    txn = await signer.wallet.sendTransaction(preparedTxn as any);
  }

  const receipt = await runtime.provider.waitForTransactionReceipt({ hash: txn });

  debug('got receipt', receipt);

  // get events
  const txnEvents: EncodedTxnEvents = _.groupBy(
    viem.parseEventLogs({ ...contract, logs: receipt.logs }).map((l) => {
      const eventAbi = viem.getAbiItem({ abi: contract!.abi, name: l.eventName }) as any;
      return { name: l.eventName, args: eventAbi.inputs.map((i: any) => (l.args as any)[i.name]) };
    }),
    'name'
  );

  debug('decoded events', txnEvents);

  return [receipt, txnEvents];
}

function parseEventOutputs(config: Config['var'], txnEvents: EncodedTxnEvents[]): { [label: string]: string } {
  const vals: { [label: string]: string } = {};
  let expectedEvent = '';

  if (config) {
    for (const n in txnEvents) {
      for (const [name, varData] of Object.entries(config)) {
        const events = _.entries(txnEvents[n][varData.event]);

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

          const v = e.args[varData.arg];

          vals[label] = typeof v == 'bigint' ? v.toString() : v;
        }
      }
    }
  }

  return vals;
}

async function importTxnData(
  runtime: ChainBuilderRuntimeInfo,
  ctx: ChainBuilderContext,
  config: Config,
  packageState: PackageState,
  txns: TransactionMap
) {
  const contracts: ChainArtifacts['contracts'] = {};

  if (config.factory) {
    for (const [k, contractAddress] of _.entries(parseEventOutputs(config.factory, _.map(txns, 'events')))) {
      const topLabel = k.split('_')[0];
      const factoryInfo = config.factory[topLabel];

      if (!contractAddress || !viem.isAddress(contractAddress)) {
        throw new Error(`address is not valid in ${topLabel}. Ensure "arg" parameter is correct`);
      }

      let abi: viem.Abi | null = null;
      let sourceName = '';
      let contractName = '';

      if (factoryInfo.artifact) {
        const artifact = await runtime.getArtifact!(factoryInfo.artifact);
        // only apply the abi from the contract if we haven't already resolved it previously
        abi = artifact.abi;
        sourceName = artifact.sourceName;
        contractName = artifact.contractName;
      }

      if (factoryInfo.abi) {
        if (factoryInfo.abi.trimStart().startsWith('[')) {
          // Allow to pass in a literal abi string
          abi = JSON.parse(factoryInfo.abi);
        } else {
          // Load the abi from another contract
          const implContract = getContractDefinitionFromPath(ctx, factoryInfo.abi);

          if (!implContract) {
            throw new Error(`previously deployed contract with name ${factoryInfo.abi} for abi not found`);
          }

          abi = implContract.abi;
        }
      } else if (factoryInfo.abiOf) {
        abi = getMergedAbiFromContractPaths(ctx, factoryInfo.abiOf);
      }

      if (!abi) {
        throw new Error(
          `factory."${topLabel}": must specify at least one of "artifact", "abi", or "abiOf" to resolve the contract ABI for the created contract.`
        );
      }

      contracts[k] = {
        address: contractAddress,
        abi,
        //deployTxnHash: txns[0].hash, // TODO: find the hash for the actual txn we are reading?
        deployTxnHash: '',
        deployTxnBlockNumber: '',
        deployTimestamp: '',
        constructorArgs: factoryInfo.constructorArgs,
        sourceName: sourceName,
        contractName: contractName,
        deployedOn: packageState.currentLabel,

        // contract was deployed as part of another transaction that was alreayd counted for gas usage, so we mark gas cost/usage as 0 here
        gasUsed: 0,
        gasCost: '0',
      };

      if (factoryInfo.highlight) {
        contracts[k].highlight = true;
      }
    }
  }

  const settings: ChainArtifacts['settings'] = parseEventOutputs(config.var || config.extra, _.map(txns, 'events'));

  return {
    contracts,
    txns,
    settings,
  };
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const invokeSpec = {
  label: 'invoke',

  validate: invokeSchema,

  async getState(_runtime, ctx, config, packageState) {
    const cfg = this.configInject(ctx, config, packageState);

    if (typeof cfg.target === 'string') {
      cfg.target = [cfg.target as string];
    }

    return [
      [
        cfg.target?.map((t) => getContractFromPath(ctx, t)?.address), // to
        cfg.func, // func
        cfg.args ? JSON.stringify(cfg.args) : null, // args
        cfg.value || '0', // value
        cfg.factory, // factory
        cfg.var || cfg.extra, // var
      ],
      {
        to: cfg.target?.map((t) => getContractFromPath(ctx, t)?.address),
        func: cfg.func,
        args: cfg.args?.map((v) => JSON.stringify(v)),
        value: cfg.value || '0',
        factory: cfg.factory,
        var: cfg.var || cfg.extra,
      },
      {
        to: cfg.target?.map((t) => getContractFromPath(ctx, t)?.address),
        func: cfg.func,
        args: cfg.args?.map((v) => JSON.stringify(v)),
        value: cfg.value || '0',
        factory: cfg.factory,
        extra: cfg.var || cfg.extra,
      },
      {
        to: cfg.target?.map((t) => getContractFromPath(ctx, t)?.address),
        func: cfg.func,
        args: cfg.args?.map((v) => JSON.stringify(v)),
        value: cfg.value || '0',
      },
    ];
  },

  configInject(ctx, config) {
    config = _.cloneDeep(config);

    if (typeof config.target === 'string') {
      config.target = [config.target as string];
    }

    if (config.target) {
      // [string, ...string[]] refers to a nonempty array
      config.target = config.target.map((v) => template(v)(ctx)) as [string, ...string[]];
    }

    if (config.abi) {
      config.abi = template(config.abi)(ctx);
    }

    config.func = template(config.func)(ctx);

    if (config.args) {
      debug('rendering invoke args with settings: ', ctx.settings);
      config.args = _.map(config.args, (a) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(template(JSON.stringify(a))(ctx));
      });
    }

    if (config.from) {
      config.from = template(config.from)(ctx);
    }

    if (config.fromCall) {
      config.fromCall.func = template(config.fromCall.func)(ctx);
      config.fromCall.args = _.map(config.fromCall.args, (a) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(template(JSON.stringify(a))(ctx));
      });
    }

    if (config.value) {
      config.value = template(config.value)(ctx);
    }

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = template(config.overrides.gasLimit)(ctx);
    }

    for (const name in config.factory) {
      const f = config.factory[name];

      f.event = template(f.event)(ctx);

      if (f.artifact) {
        f.artifact = template(f.artifact)(ctx);
      }

      if (f.abiOf) {
        f.abiOf = _.map(f.abiOf, (v) => template(v)(ctx));
      }

      if (f.abi) {
        f.abi = template(f.abi || '')(ctx);
      }
    }

    const varsConfig = config.var || config.extra;

    for (const name in varsConfig) {
      const f = varsConfig[name];
      f.event = template(f.event)(ctx);
    }

    return config;
  },

  getInputs(config, possibleFields) {
    let accesses = computeTemplateAccesses(config.abi, possibleFields);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.func, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.from, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.value, possibleFields));

    if (typeof config.target === 'string') {
      config.target = [config.target as string];
    }

    for (const target of config.target) {
      if (viem.isAddress(target)) continue;

      if (isStepName(target)) {
        accesses.accesses.push(`contracts.${target}`);
      } else if (isStepPath(target)) {
        accesses.accesses.push(`imports.${target.split('.')[0]}`);
      } else if (isTemplateString(target)) {
        for (const match of getTemplateMatches(target)) {
          accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(match, possibleFields));
        }
      }
    }

    if (config.args) {
      _.forEach(
        config.args,
        (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(JSON.stringify(a), possibleFields)))
      );
    }

    if (config.fromCall) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.fromCall.func, possibleFields));

      _.forEach(
        config.fromCall.args,
        (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(JSON.stringify(a), possibleFields)))
      );
    }

    if (config?.overrides) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.overrides.gasLimit, possibleFields));
    }

    for (const name in config.factory) {
      const f = config.factory[name];

      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(f.event, possibleFields));
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(f.artifact, possibleFields));
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(f.abi, possibleFields));

      _.forEach(f.abiOf, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a, possibleFields))));
    }

    const varsConfig = config.var || config.extra;
    for (const name in varsConfig) {
      const f = varsConfig[name];
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(f.event, possibleFields));
    }

    return accesses;
  },

  getOutputs(config, packageState) {
    const outputs = [`txns.${packageState.currentLabel.split('.')[1]}`];

    // factories can output contracts, and var can output vars
    if (config.factory) {
      for (const k in config.factory) {
        if ((config.factory[k].expectCount || 1) > 1) {
          for (let i = 0; i < config.factory[k].expectCount!; i++) {
            outputs.push(`contracts.${k}_${i}`);
            outputs.push(`${k}_${i}`);
          }
        } else {
          outputs.push(`contracts.${k}`);
          outputs.push(k);
        }
      }
    }

    const varsConfig = config.var || config.extra;
    if (varsConfig) {
      for (const k in varsConfig) {
        if ((varsConfig[k].expectCount || 1) > 1) {
          for (let i = 0; i < varsConfig[k].expectCount!; i++) {
            outputs.push(`settings.${k}_${i}`);
            // backwards compatibility
            outputs.push(`extras.${k}_${i}`);
          }
        } else {
          outputs.push(`settings.${k}`);
          //backwards compatibility
          outputs.push(`extras.${k}`);
        }
      }
    }

    return outputs;
  },

  async exec(runtime, ctx, config, packageState) {
    debug('exec', config);

    const txns: TransactionMap = {};

    const mainSigner = config.from
      ? await runtime.getSigner(config.from as viem.Address)
      : await runtime.getDefaultSigner!({}, '');

    const customAbi =
      typeof config.abi === 'string'
        ? config.abi.startsWith('[')
          ? JSON.parse(config.abi)
          : getContractDefinitionFromPath(ctx, config.abi)?.abi
        : null;

    for (const t of config.target || []) {
      let contract: Contract | null;

      debug('get contract for target: ', t);
      if (viem.isAddress(t)) {
        if (!customAbi) {
          throw new Error('abi must be defined if addresses is used for target');
        }

        contract = { address: t, abi: customAbi };
      } else {
        contract = getContractFromPath(ctx, t);

        if (contract && customAbi) {
          contract.abi = customAbi;
        }
      }

      if (!contract) {
        throw new Error(`field "target": contract with name '${t}' not found. The valid list of recognized contracts is:
${getAllContractPaths(ctx).join('\n')}`);
      }

      const [receipt, txnEvents] = await runTxn(runtime, config, contract, mainSigner, packageState);

      const block = await runtime.provider.getBlock({ blockHash: receipt.blockHash });

      const splitLabel = packageState.currentLabel.split('.')[1];

      const label = config.target?.length === 1 ? splitLabel || '' : `${splitLabel}_${t}`;

      debug('ran txn', label);
      debug('got events', txnEvents);

      txns[label] = {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        timestamp: block.timestamp.toString(),
        events: txnEvents,
        deployedOn: packageState.currentLabel,
        gasUsed: Number(receipt.gasUsed),
        gasCost: receipt.effectiveGasPrice.toString(),
        signer: viem.getAddress(receipt.from),
      };
    }

    return importTxnData(runtime, ctx, config, packageState, txns);
  },

  async importExisting(runtime, ctx, config, packageState, existingKeys) {
    const txns: TransactionMap = {};
    for (let i = 0; i < existingKeys.length; i++) {
      const key = existingKeys[i] as viem.Hash;
      const splitLabel = packageState.currentLabel.split('.')[1];
      const label = config.target?.length === 1 ? splitLabel || '' : `${splitLabel}_${i}`;

      const customAbi =
        typeof config.abi === 'string'
          ? config.abi.startsWith('[')
            ? JSON.parse(config.abi)
            : getContractDefinitionFromPath(ctx, config.abi)?.abi
          : null;

      debug('resolved contract abi for txn decode', customAbi, config);

      let contract: Contract | null;
      if (viem.isAddress(config.target[i])) {
        if (!customAbi) {
          throw new Error('abi must be defined if addresses is used for target');
        }

        contract = { address: config.target[i] as viem.Address, abi: customAbi };
      } else {
        contract = getContractFromPath(ctx, config.target[i]);

        if (customAbi && contract) {
          contract.abi = customAbi;
        }
      }

      if (!contract) {
        throw new Error('target contract not found');
      }

      const receipt = await runtime.provider.getTransactionReceipt({ hash: key });
      const txnEvents: EncodedTxnEvents = _.groupBy(
        viem.parseEventLogs({ ...contract, logs: receipt.logs }).map((l) => {
          const eventAbi = viem.getAbiItem({ abi: contract!.abi, name: l.eventName }) as any;
          return { name: l.eventName, args: eventAbi.inputs.map((i: any) => (l.args as any)[i.name]) };
        }),
        'name'
      );

      txns[label] = {
        hash: key,
        events: txnEvents as EncodedTxnEvents,
        deployedOn: packageState.currentLabel,
        gasUsed: Number(receipt.gasUsed),
        gasCost: receipt.effectiveGasPrice.toString(),
        signer: viem.getAddress(receipt.from),
      };
    }

    return importTxnData(runtime, ctx, config, packageState, txns);
  },
} satisfies CannonAction<Config>;

export default invokeSpec;
