import _ from 'lodash';

import { ethers, ethers as Ethers } from 'ethers';

import chalk from 'chalk';

const { red, bold, gray, green, yellow, cyan } = chalk;

import prompts, { Choice } from 'prompts';
import Wei, { wei } from '@synthetixio/wei';
import { PackageDefinition } from './types';
import { CannonWrapperGenericProvider } from '@usecannon/builder';

const PROMPT_BACK_OPTION = { title: '↩ BACK' };

type InteractTaskArgs = {
  packages: PackageDefinition[];
  contracts: { [name: string]: Ethers.Contract }[];
  provider: CannonWrapperGenericProvider;

  signer?: ethers.Signer;
  blockTag?: number;
};

export async function interact(ctx: InteractTaskArgs) {
  // -----------------
  // Start interaction
  // -----------------

  await printHeader(ctx);

  let pickedPackage = -1;
  let pickedContract: string | null = null;
  let pickedFunction: string | null = null;
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
        func: ctx.contracts[pickedPackage][pickedContract].interface.getFunction(pickedFunction),
      });

      if (!argData) {
        pickedFunction = null;
      } else {
        currentArgs = argData.args;
        txnValue = wei(argData.value);
      }
    } else {
      const contract = ctx.contracts[pickedPackage][pickedContract!];
      const functionInfo = contract.interface.getFunction(pickedFunction!);

      if (functionInfo.constant || !ctx.signer) {
        await query({
          contract,
          functionSignature: pickedFunction,
          args: currentArgs,
          blockTag: ctx.blockTag,
        });
      } else {
        const receipt = await execTxn({
          signer: ctx.signer,
          contract,
          functionSignature: pickedFunction,
          args: currentArgs,
          value: txnValue.toBN(),
        });

        if (receipt?.status === 1) {
          await logTxSucceed(ctx, receipt);
        } else {
          await logTxFail('txn is null');
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
  const signerBalance = ctx.signer ? wei(await ctx.signer.getBalance()) : wei(0);

  console.log('\n');
  console.log(gray('================================================================================'));
  console.log(gray('> Gas price: provider default'));
  console.log(gray(`> Block tag: ${ctx.blockTag || 'latest'}`));

  if (ctx.signer) {
    console.log(yellow(`> Read/Write: ${await ctx.signer.getAddress()}`));

    if (signerBalance.gt(1)) {
      console.log(green(`> Signer Balance: ${signerBalance.toString(2)}`));
    } else if (signerBalance.gt(0.1)) {
      console.log(yellow(`> Signer Balance: ${signerBalance.toString(4)}`));
    } else {
      console.log(red(`> WARNING! Low signer balance: ${signerBalance.toString(4)}`));
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

  console.log(gray(`  * Signer: ${ctx.signer ? await ctx.signer.getAddress() : 'None'}`));
  console.log('\n');
}

interface PackageChoice extends Choice {
  value: number;
}

async function pickPackage(packages: PackageDefinition[]) {
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

async function pickContract({ contractNames }: { contractNames: string[] }) {
  const choices = contractNames.sort().map((s) => ({ title: s }));
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

async function pickFunction({ contract }: { contract: ethers.Contract }) {
  const functionSignatures = Object.keys(contract.functions).filter((f) => f.indexOf('(') != -1);

  const choices = functionSignatures.sort().map((s) => ({ title: s }));
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

  return pickedFunction == PROMPT_BACK_OPTION.title ? null : pickedFunction;
}

async function pickFunctionArgs({ func }: { func: Ethers.utils.FunctionFragment }) {
  const args: any[] = [];
  let value: ethers.BigNumber = wei(0).toBN();

  if (func.payable) {
    const { txnValue } = await prompts.prompt([
      {
        type: 'number',
        name: 'txnValue',
        message: 'Function is payable. ETH AMOUNT (in eth units):',
      },
    ]);

    value = wei(txnValue).toBN();
  }

  for (const input of func.inputs) {
    const rawValue = await promptInputValue(input);

    if (!rawValue) {
      return null;
    }

    args.push(rawValue);
  }

  return { args, value };
}

async function query({
  contract,
  functionSignature,
  args,
  blockTag,
}: {
  contract: ethers.Contract;
  functionSignature: string;
  args: any[];
  blockTag?: number;
}) {
  const functionInfo = contract.interface.getFunction(functionSignature);

  let result = [];
  try {
    result = await contract.callStatic[functionSignature!](...args, {
      blockTag,
    });
  } catch (err) {
    console.error('failed query:', err);
    return null;
  }

  for (let i = 0; i < (functionInfo.outputs?.length || 0); i++) {
    const output = functionInfo.outputs![i];

    console.log(
      cyan(`  ↪ ${output.name || ''}(${output.type}):`),
      printReturnedValue(output, functionInfo.outputs!.length > 1 ? result[i] : result)
    );
  }

  return result;
}

async function execTxn({
  contract,
  functionSignature,
  args,
  value,
  signer,
}: {
  contract: ethers.Contract;
  functionSignature: string;
  args: any[];
  value: any;
  signer: Ethers.Signer;
}) {
  const callData = contract.interface.encodeFunctionData(functionSignature, args);

  let txn: ethers.PopulatedTransaction | null = {};

  // estimate gas
  try {
    txn = await contract.populateTransaction[functionSignature](...args, {
      from: await signer.getAddress(),
    });
    const estimatedGas = await contract.estimateGas[functionSignature](...args, {
      from: await signer.getAddress(),
    });

    console.log(gray(`  > calldata: ${txn.data}`));
    console.log(gray(`  > estimated gas required: ${estimatedGas}`));
    console.log(gray(`  > gas: ${JSON.stringify(_.pick(txn, 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas'))}`));
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

    let txInfo;
    try {
      txInfo = await signer.sendTransaction({
        to: contract.address,
        data: callData,
        value: Ethers.BigNumber.from(value),
      });

      console.log('> hash: ', txInfo.hash);
      console.log('confirming...');

      const receipt = await txInfo.wait();

      return receipt;
    } catch (err) {
      logTxFail(err);
      return null;
    }
  } else {
    console.log('not submitting transaction because in read-only mode');
  }
}

async function promptInputValue(input: Ethers.utils.ParamType): Promise<any> {
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

      if (!answer[name]) {
        return null;
      }

      // if there is a problem this will throw and user will be forced to re-enter data
      return parseInput(input, answer[name]);
    } catch (err) {
      console.error('invalid input: ', err);
    }
  }
}

function parseInput(input: Ethers.utils.ParamType, rawValue: string): any {
  const requiresBytes32Util = input.type.includes('bytes32');
  const isArray = input.type.includes('[]');
  const isNumber = input.type.includes('int');

  let processed = isArray ? JSON.parse(rawValue) : rawValue;
  if (requiresBytes32Util) {
    if (isArray) {
      processed = processed.map((item: string) => Ethers.utils.formatBytes32String(item));
    } else {
      processed = Ethers.utils.formatBytes32String(processed);
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
  } else {
    processed = boolify(processed);
  }

  //const processed = preprocessInput(input, type, hre);
  if (processed !== rawValue) {
    console.log(gray(`  > processed inputs (${isArray ? processed.length : '1'}):`, processed));
  }

  // Encode user's input to validate it
  Ethers.utils.defaultAbiCoder.encode([input.type], [processed]);

  return processed;
}

function parseWeiValue(v: string): Ethers.BigNumber {
  if (v.includes('.')) {
    return wei(v).toBN();
  } else {
    return wei(v, 0, true).toBN();
  }
}

function printReturnedValue(output: Ethers.utils.ParamType, value: any): string {
  if (output?.baseType === 'tuple') {
    // handle structs
    return '\n' + output?.components.map((comp, ind) => `${comp.name}: ${printReturnedValue(comp, value[ind])}`).join('\n');
  } else if (output?.baseType === 'array' && Array.isArray(value)) {
    // handle arrays
    return value.map((item) => printReturnedValue(output.arrayChildren, item)).join(', ');
  } else if (output?.type.startsWith('uint') || output?.type.startsWith('int')) {
    return `${value.toString()} (${wei(value).toString(5)})`;
  } else if (output?.type.startsWith('bytes')) {
    return `${value} (${Buffer.from(value.slice(2), 'hex').toString('utf8')})`;
  } else {
    return value;
  }
}

// Avoid 'false' and '0' being interpreted as bool = true
function boolify(value: any) {
  if (value === 'false' || value === '0') return 0;
  return value;
}

async function logTxSucceed(ctx: InteractTaskArgs, receipt: Ethers.providers.TransactionReceipt) {
  console.log(green('  ✅ Success'));
  // console.log('receipt', JSON.stringify(receipt, null, 2));

  // Print tx hash
  console.log(gray(`    tx hash: ${receipt.transactionHash}`));

  // Print gas used
  console.log(gray(`    gas used: ${receipt.gasUsed.toString()}`));

  // Print emitted events
  if (receipt.logs && receipt.logs.length > 0) {
    const contractsByAddress = _.groupBy(_.flatten(ctx.contracts.map(_.values)), 'address');

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];

      // find contract matching address of the log
      const logContracts = contractsByAddress[log.address];

      let foundLog = false;
      for (const logContract of logContracts) {
        try {
          const parsedLog = logContract.interface.parseLog(log);

          foundLog = true;
          console.log(gray(`\n    log ${i}:`), cyan(parsedLog.name));

          for (let i = 0; i < (parsedLog.args.length || 0); i++) {
            const output = parsedLog.args[i];
            const paramType = logContract.interface.getEvent(parsedLog.name).inputs[i];

            console.log(cyan(`  ↪ ${output.name || ''}(${paramType.type}):`), printReturnedValue(paramType, output));
          }
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
      if (error.hasOwn('reason')) {
        return error.reason;
      } else if (error.hasOwn('error')) {
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
