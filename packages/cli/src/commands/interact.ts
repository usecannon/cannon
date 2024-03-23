import _ from 'lodash';
import * as viem from 'viem';
import prompts, { Choice } from 'prompts';
import Wei, { wei } from '@synthetixio/wei';
import { red, bold, gray, green, yellow, cyan } from 'chalk';
import { CannonSigner, ChainArtifacts, Contract, ContractMap, traceActions } from '@usecannon/builder';

import { formatAbiFunction } from '../helpers';
import { PackageSpecification } from '../types';

const PROMPT_BACK_OPTION = { title: '↩ BACK' };

type InteractTaskArgs = {
  packages: PackageSpecification[];
  packagesArtifacts?: ChainArtifacts[];
  contracts: { [name: string]: Contract }[];
  provider: viem.PublicClient;
  signer?: CannonSigner;
  blockTag?: number;
};

export async function interact(ctx: InteractTaskArgs) {
  // -----------------
  // Start interaction
  // -----------------

  await printHeader(ctx);

  let pickedPackage = -1;
  let pickedContract: string | null = null;
  let pickedFunction: viem.AbiFunction | null = null;
  let currentArgs: any[] | null = null;
  let txnValue: Wei = wei(0);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (ctx.packages.length === 1) {
      pickedPackage = 0;
    }

    if (pickedPackage === -1) {
      pickedPackage = await pickPackage(ctx.packages);

      if (pickedPackage === -1) {
        return null;
      }
    } else if (!pickedContract) {
      pickedContract = await pickContract({
        contractNames: Object.keys(ctx.contracts[pickedPackage]),
        contractArtifacts: ctx.packagesArtifacts?.[pickedPackage]?.contracts,
      });

      if (!pickedContract) {
        if (ctx.packages.length === 1) {
          return null;
        }

        pickedPackage = -1;
      }
    } else if (!pickedFunction) {
      await printHelpfulInfo(ctx, pickedPackage, pickedContract);
      pickedFunction = await pickFunction({
        contract: ctx.contracts[pickedPackage][pickedContract],
      });

      if (!pickedFunction) {
        pickedContract = null;
      }
    } else if (!currentArgs) {
      const argData = await pickFunctionArgs({
        func: pickedFunction,
      });

      if (!argData) {
        pickedFunction = null;
      } else {
        currentArgs = argData.args;
        txnValue = wei(argData.value.toString());
      }
    } else {
      const contract = ctx.contracts[pickedPackage][pickedContract!];
      if (ctx.packagesArtifacts) {
        ctx.provider = ctx.provider.extend(traceActions(ctx.packagesArtifacts[pickedPackage]) as any);
      }

      if (pickedFunction.stateMutability === 'view' || pickedFunction.stateMutability === 'pure') {
        await query({
          provider: ctx.provider,
          contract,
          functionAbi: pickedFunction,
          args: currentArgs,
          blockTag: ctx.blockTag,
        });
      } else if (!ctx.signer) {
        console.log();
        console.log(red('  Signer is not supplied. cannot invoke writable function.'));
        console.log();
      } else {
        const receipt = await execTxn({
          provider: ctx.provider,
          signer: ctx.signer,
          contract,
          functionAbi: pickedFunction,
          args: currentArgs,
          value: txnValue.toBN(),
        });

        if (receipt?.status === 'success') {
          await logTxSucceed(ctx, receipt);
        } else {
          logTxFail('tx did not succeed');
        }
      }

      // return to function select
      pickedFunction = null;
      currentArgs = null;
    }
  }
}

async function printHeader(ctx: InteractTaskArgs) {
  // retrieve balance of the signer address
  // this isnt always necessary but it serves as a nice test that the provider is working
  // and prevents the UI from lurching later if its queried later
  const signerBalance = ctx.signer ? await ctx.provider.getBalance({ address: ctx.signer.address }) : BigInt(0);

  console.log('\n');
  console.log(gray('================================================================================'));
  console.log(gray('> Gas price: provider default'));
  console.log(gray(`> Block tag: ${ctx.blockTag || 'latest'}`));

  if (ctx.signer) {
    console.log(yellow(`> Read/Write: ${ctx.signer.address}`));

    if (signerBalance > viem.parseEther('0.01')) {
      console.log(green(`> Signer Balance: ${viem.formatEther(signerBalance)}`));
    } else {
      console.log(red(`> WARNING! Low signer balance: ${viem.formatEther(signerBalance)}`));
    }
  } else {
    console.log(gray('> Read Only'));
  }

  console.log(gray('================================================================================'));
  console.log('\n');
}

async function printHelpfulInfo(ctx: InteractTaskArgs, pickedPackage: number, pickedContract: string | null) {
  if (pickedContract) {
    console.log(gray.inverse(`${pickedContract} => ${ctx.contracts[pickedPackage][pickedContract].address}`));
  }

  console.log(gray(`  * Signer: ${ctx.signer ? ctx.signer.address : 'None'}`));
  console.log('\n');
}

interface PackageChoice extends Choice {
  value: number;
}

async function pickPackage(packages: PackageSpecification[]) {
  const choices: PackageChoice[] = packages.map((p, i) => ({
    title: `${p.name}:${p.version}`,
    value: i,
    description: Object.entries(p.settings)
      .map(([k, v]) => `${k}=${v}`)
      .join(' | '),
  }));

  choices.unshift({ ...PROMPT_BACK_OPTION, value: -1 });

  const { pickedPackage } = await prompts.prompt([
    {
      type: 'select',
      name: 'pickedPackage',
      message: 'Pick a PACKAGE:',
      choices,
    },
  ]);

  return typeof pickedPackage === 'number' ? pickedPackage : -1;
}

async function pickContract({
  contractNames,
  contractArtifacts,
}: {
  contractNames: string[];
  contractArtifacts?: ContractMap;
}) {
  const isHighlighted = (n: string) => !!contractArtifacts?.[n]?.highlight ?? false;

  const choices: Choice[] = _.sortBy(contractNames, [
    (contractName) => !isHighlighted(contractName),
    (contractName) => contractName,
  ]).map((contractName) => ({
    title: isHighlighted(contractName) ? bold(contractName) : contractName,
    value: contractName,
  }));

  choices.unshift(PROMPT_BACK_OPTION);

  const { pickedContract } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedContract',
      message: 'Pick a CONTRACT:',
      choices,
      suggest: suggestBySubtring,
    },
  ]);

  return pickedContract === PROMPT_BACK_OPTION.title ? null : pickedContract;
}

function assembleFunctionSignatures(abi: viem.Abi): [viem.AbiFunction[], string[]] {
  const abiFunctions = abi.filter((v) => v.type === 'function') as viem.AbiFunction[];

  const prettyNames = abiFunctions.map(formatAbiFunction);

  return [abiFunctions, prettyNames];
}

async function pickFunction({ contract }: { contract: Contract }) {
  const [abiFunctions, functionSignatures] = assembleFunctionSignatures(contract.abi);

  const choices = _.sortBy(functionSignatures).map((s) => ({ title: s }));
  choices.unshift(PROMPT_BACK_OPTION);

  const { pickedFunction } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedFunction',
      message: 'Pick a FUNCTION:',
      choices,
      suggest: suggestBySubtring,
    },
  ]);

  return pickedFunction == PROMPT_BACK_OPTION.title ? null : abiFunctions[functionSignatures.indexOf(pickedFunction)];
}

async function pickFunctionArgs({ func }: { func: viem.AbiFunction }) {
  const args: any[] = [];
  let value = BigInt(0);

  if (func.stateMutability === 'payable') {
    const { txnValue } = await prompts.prompt([
      {
        type: 'text',
        name: 'txnValue',
        message: 'Function is payable. ETH AMOUNT (in eth units):',
      },
    ]);

    value = viem.parseEther(txnValue);
  }

  for (const input of func.inputs) {
    const rawValue = await promptInputValue(input);

    if (_.isNil(rawValue)) {
      return null;
    }

    args.push(rawValue);
  }

  return { args, value };
}

async function query({
  provider,
  contract,
  functionAbi,
  args,
  blockTag,
}: {
  provider: viem.PublicClient;
  contract: Contract;
  functionAbi: viem.AbiFunction;
  args: any[];
  blockTag?: number;
}) {
  const callData = viem.encodeFunctionData({
    abi: [functionAbi],
    functionName: functionAbi.name,
    args,
  });
  console.log(gray(`  > calldata: ${callData}`));

  let result = [];
  const callArgs = {
    address: contract.address,
    abi: [functionAbi],
    functionName: functionAbi.name,
    args,
    blockTag: blockTag as any,
  };
  try {
    console.log(gray(`  > estimated gas required: ${await provider.estimateContractGas(callArgs)}`));
    const simulation = await provider.simulateContract(callArgs);
    result = simulation.result;
  } catch (err: any) {
    console.error('failed query:', err?.message && process.env.TRACE !== 'true' ? err?.message : err);
    return null;
  }

  for (let i = 0; i < functionAbi.outputs.length; i++) {
    const output = functionAbi.outputs[i];

    console.log(
      cyan(`  ↪ ${output.name || ''}(${output.type}):`),
      renderArgs(output, functionAbi.outputs.length > 1 ? result[i] : result)
    );
  }

  return result;
}

async function execTxn({
  contract,
  functionAbi,
  args,
  value,
  provider,
  signer,
}: {
  contract: Contract;
  functionAbi: viem.AbiFunction;
  args: any[];
  value: any;
  provider: viem.PublicClient;
  signer: CannonSigner;
}) {
  const callData = viem.encodeFunctionData({
    abi: [functionAbi],
    functionName: functionAbi.name,
    args,
  });

  let txn: viem.TransactionRequest | null = null;

  // estimate gas
  try {
    txn = (await provider.prepareTransactionRequest({
      account: signer.wallet.account || signer.address,
      chain: provider.chain,
      to: contract.address,
      data: callData,
      value: viem.parseEther(value.toString() || '0'),
    })) as any;

    console.log(gray(`  > calldata: ${txn!.data}`));
    console.log(gray(`  > estimated gas required: ${txn!.gas}`));
    console.log(
      gray(
        `  > gas: ${JSON.stringify(
          _.mapValues(_.pick(txn, 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas'), viem.formatGwei)
        )}`
      )
    );
    console.log(green(bold('  ✅ txn will succeed')));
  } catch (err) {
    console.error(red(`❌ txn will most likely fail: ${(err as Error).toString()}`));
  }

  if (signer != null) {
    const { confirmation } = await prompts.prompt([
      {
        type: 'confirm',
        name: 'confirmation',
        message: 'Send transaction?',
      },
    ]);

    if (!confirmation) {
      return null;
    }

    let txHash;
    try {
      txHash = await signer.wallet.sendTransaction({
        ...(txn as any)!,
      });

      console.log('> hash: ', txHash);
      console.log('confirming...');

      const receipt = await provider.waitForTransactionReceipt({ hash: txHash });

      return receipt;
    } catch (err) {
      logTxFail(err);
      return null;
    }
  } else {
    console.log('not submitting transaction because in read-only mode');
  }
}

async function promptInputValue(input: viem.AbiParameter): Promise<any> {
  const name = input.name || input.type;

  const message = input.name ? `${input.name} (${input.type})` : input.type;

  for (let i = 0; i < 5; i++) {
    try {
      const answer = await prompts.prompt([
        {
          type: 'text',
          message,
          name,
        },
      ]);

      // if there is a problem this will throw and user will be forced to re-enter data
      return parseInput(input, answer[name]);
    } catch (err) {
      console.error('invalid input: ', err);
    }
  }
}

function parseInput(input: viem.AbiParameter, rawValue: string): any {
  const isTuple = input.type.includes('tuple');
  const isBytes32 = input.type.includes('bytes32');
  const isArray = input.type.includes('[]');
  const isNumber = input.type.includes('int');
  const isBoolean = input.type.includes('bool');

  let processed = isArray || isTuple ? JSON.parse(rawValue) : rawValue;
  if (isBytes32 && !viem.isHex(processed)) {
    if (isArray) {
      processed = processed.map((item: string) => viem.stringToHex(item, { size: 32 }));
    } else {
      processed = viem.stringToHex(processed, { size: 32 });
    }
  }

  if (isNumber) {
    if (isArray) {
      processed = processed.map((item: string) => parseWeiValue(item));
    } else {
      processed = parseWeiValue(processed);
    }
  }

  if (isArray) {
    processed = processed.map((value: string) => boolify(value));
  }

  if (isBoolean) {
    switch (processed.toLowerCase()) {
      case 'false':
      case '0':
      case 'no':
        processed = false;
        break;
      case 'true':
      case '1':
      case 'yes':
        processed = true;
        break;
      default:
        processed = null;
    }
  }

  //const processed = preprocessInput(input, type, hre);
  if (processed !== rawValue) {
    console.log(gray(`  > processed inputs (${isArray ? processed.length : '1'}):`, processed));
  }

  // Encode user's input to validate it
  viem.encodeAbiParameters([input], [processed]);

  return processed;
}

function parseWeiValue(v: string): bigint {
  if (v.includes('.')) {
    return viem.parseEther(v);
  } else {
    return BigInt(v);
  }
}

/**
 * Checks if a given ABI parameter is a tuple with components.
 *
 * This function acts as a type guard, allowing TypeScript to understand
 * that the parameter passed to it, if the function returns true,
 * is not just any AbiParameter, but specifically one that includes
 * the 'components' property.
 *
 * @param {viem.AbiParameter} parameter - The ABI parameter to check.
 * @returns {boolean} - True if the parameter is a tuple with components, false otherwise.
 */
function _isTupleParameter(
  parameter: viem.AbiParameter
): parameter is viem.AbiParameter & { components: readonly viem.AbiParameter[] } {
  return 'components' in parameter && parameter.type.startsWith('tuple');
}

/**
 * Converts an object to a prettified JSON string with a specified indentation and offset.
 *
 * @param {any} obj - The object to be converted into a JSON string.
 * @param {number} offsetSpaces - The number of spaces to offset the entire JSON string. Default is 4.
 * @param {number} indentSpaces - The number of spaces used for indentation in the JSON string. Default is 2.
 * @returns {string} - The prettified and offset JSON string.
 */
export function stringifyWithOffset(obj: any, offsetSpaces = 4, indentSpaces = 2) {
  const jsonString = JSON.stringify(obj, null, indentSpaces);
  const offset = ' '.repeat(offsetSpaces);
  return jsonString
    .split('\n')
    .map((line) => offset + line)
    .join('\n');
}

/**
 * Renders the arguments for a given ABI parameter and its associated value.
 * This function handles different data structures (tuples, arrays, uint, int, etc).
 *
 * @param {viem.AbiParameter} input - The ABI parameter describing the type and structure of the value.
 * @param {any} value - The value associated with the ABI parameter.
 * @param {string} offset - A string used for initial indentation, facilitating readable output formatting.
 * @returns {string} - A string representation of the argument, formatted for readability.
 */
export function renderArgs(input: viem.AbiParameter, value: any, offset = ' '): string {
  const lines: string[] = [];

  switch (true) {
    case _isTupleParameter(input):
      lines.push('', stringifyWithOffset(value));
      break;

    case input.type.endsWith('[]') && Array.isArray(value):
      lines.push('', stringifyWithOffset(value));
      break;

    default:
      lines.push(`${offset}${value.toString()}`);
  }

  return lines.join('\n');
}

// Avoid 'false' and '0' being interpreted as bool = true
function boolify(value: any) {
  if (value === 'false' || value === '0') return 0;
  return value;
}

async function logTxSucceed(ctx: InteractTaskArgs, receipt: viem.TransactionReceipt) {
  console.log(green('  ✅ Success'));
  // console.log('receipt', JSON.stringify(receipt, null, 2));

  // Print tx hash
  console.log(gray(`    tx hash: ${receipt.transactionHash}`));

  // Print gas used
  console.log(gray(`    gas used: ${receipt.gasUsed.toString()}`));

  // Print emitted events
  if (receipt.logs && receipt.logs.length > 0) {
    const contractsByAddress = _.mapKeys(
      _.groupBy(_.flatten(ctx.contracts.map((contract) => _.toPairs(contract))), '1.address'),
      (v, k) => k.toLowerCase()
    );

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];

      let foundLog = false;
      for (const [n, logContract] of contractsByAddress[log.address.toLowerCase()] || []) {
        try {
          // find contract matching address of the log
          const parsedLog = viem.decodeEventLog({ ...logContract, ...log });
          foundLog = true;
          console.log(gray(`\n    log ${i}:`), cyan(parsedLog.eventName), gray(`\t${n}`));

          //logContract.interface.getEvent(parsedLog.name).inputs[i]
          // TODO: for some reason viem does not export `AbiEvent` type (even though they export other types like AbiFunction)
          const eventAbiDef = viem.getAbiItem({ abi: logContract.abi, name: parsedLog.eventName as any }) as any;

          for (const [a, arg] of ((eventAbiDef.inputs || []) as viem.AbiParameter[]).entries()) {
            const output = parsedLog.args![arg.name || (`${a}` as any)];

            console.log(cyan(`  ↪ ${arg.name || ''}(${arg.type}):`), renderArgs(arg, output));
          }

          break;
        } catch (err) {
          // nothing
        }
      }

      if (!foundLog) {
        console.log(gray(`\n    log ${i}: unable to decode log - ${JSON.stringify(log)}`));
      }
    }
  }
}

function logTxFail(error: any) {
  console.log(red('  ❌ Error'));

  function findReason(error: any): string {
    if (typeof error === 'string') {
      return error;
    } else {
      if (_.get(error, 'reason')) {
        return error.reason;
      } else if (_.get(error, 'error')) {
        return findReason(error.error);
      }
    }

    return error.toString();
  }

  const reason = findReason(error);
  if (reason) console.log(red(`    Reason: ${reason}`));

  console.log(gray(JSON.stringify(error, null, 2)));
}

// filters choices by subtrings that don't have to be continuous e.g. 'ybtc' will match 'SynthsBTC'
const suggestBySubtring = (input: string, choices: [{ title: string }]) =>
  Promise.resolve(
    choices.filter((choice) => {
      const titleStr = choice.title.toLowerCase();
      let index = 0;
      for (const c of input.toLowerCase()) {
        index = titleStr.indexOf(c, index);
        if (index === -1) {
          return false; // not found
        } else {
          index += 1; // start from next index
        }
      }
      return true;
    })
  );
