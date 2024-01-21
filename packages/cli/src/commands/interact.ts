import _ from 'lodash';

import viem from 'viem';

import chalk from 'chalk';

const { red, bold, gray, green, yellow, cyan } = chalk;

import prompts, { Choice } from 'prompts';
import Wei, { wei } from '@synthetixio/wei';
import { PackageSpecification } from '../types';
import { CannonSigner, ChainArtifacts, Contract, ContractMap } from '@usecannon/builder';

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
        func: viem.getAbiItem({ abi: ctx.contracts[pickedPackage][pickedContract].abi, name: pickedFunction }) as viem.AbiFunction,
      });

      if (!argData) {
        pickedFunction = null;
      } else {
        currentArgs = argData.args;
        txnValue = wei(argData.value.toString());
      }
    } else {
      const contract = ctx.contracts[pickedPackage][pickedContract!];
      const functionInfo = viem.getAbiItem({ ...contract, name: pickedFunction! }) as viem.AbiFunction;
      if (ctx.packagesArtifacts) {
        // TODO
        //ctx.provider.artifacts = ctx.packagesArtifacts[pickedPackage];
      }

      if (functionInfo.stateMutability === 'view' || functionInfo.stateMutability === 'pure') {
        await query({
          provider: ctx.provider,
          contract,
          functionSignature: pickedFunction,
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
  const signerBalance = ctx.signer ? wei((await ctx.provider.getBalance({ address: ctx.signer.address })).toString()) : wei(0);

  console.log('\n');
  console.log(gray('================================================================================'));
  console.log(gray('> Gas price: provider default'));
  console.log(gray(`> Block tag: ${ctx.blockTag || 'latest'}`));

  if (ctx.signer) {
    console.log(yellow(`> Read/Write: ${await ctx.signer.address}`));

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

  console.log(gray(`  * Signer: ${ctx.signer ? await ctx.signer.address : 'None'}`));
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

async function pickFunction({ contract }: { contract: Contract }) {
  const functionSignatures = Object.keys(contract.abi.filter(v => v.type === 'function').map(v => (v as viem.AbiFunction).name)).filter((f) => f.indexOf('(') != -1);

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

    if (!rawValue && rawValue !== false) {
      return null;
    }

    args.push(rawValue);
  }

  return { args, value };
}

async function query({
  provider,
  contract,
  functionSignature,
  args,
  blockTag,
}: {
  provider: viem.PublicClient;
  contract: Contract;
  functionSignature: string;
  args: any[];
  blockTag?: number;
}) {
  const functionInfo = viem.getAbiItem({ ...contract, name: functionSignature }) as viem.AbiFunction;

  const callData = viem.encodeFunctionData({ ...contract, functionName: functionSignature, args });
  console.log(gray(`  > calldata: ${callData}`));

  let result = [];
  const callArgs = { ...contract, functionName: functionSignature, args, blockTag: blockTag as any };
  try {
    console.log(
      gray(`  > estimated gas required: ${await provider.estimateContractGas(callArgs)}`)
    );
    const simulation = await provider.simulateContract(callArgs);
    result = simulation.result;
  } catch (err: any) {
    console.error('failed query:', err?.message && process.env.TRACE !== 'true' ? err?.message : err);
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
  provider,
  signer,
}: {
  contract: Contract;
  functionSignature: string;
  args: any[];
  value: any;
  provider: viem.PublicClient,
  signer: CannonSigner;
}) {
  const callData = viem.encodeFunctionData({ ...contract, functionName: functionSignature, args });

  let txn: viem.TransactionRequest | null = null;

  // estimate gas
  try {
    txn = await provider.prepareTransactionRequest({
      account: signer.address,
      chain: provider.chain,
      to: contract.address,
      data: callData,
      value: BigInt(value),
    }) as any;
    /*const estimatedGas = await contract.estimateGas[functionSignature](...args, {
      from: await signer.address,
      value: BigInt(value),
    });*/

    console.log(gray(`  > calldata: ${txn!.data}`));
    console.log(gray(`  > estimated gas required: ${txn!.gas}`));
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

    let txHash;
    try {
      txHash = await signer.wallet.sendTransaction({ account: signer.address, chain: signer.wallet.chain, ...txn! });

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

function parseInput(input: viem.AbiParameter, rawValue: string): any {
  const isTuple = input.type.includes('tuple');
  const isBytes32 = input.type.includes('bytes32');
  const isArray = input.type.includes('[]');
  const isNumber = input.type.includes('int');
  const isBoolean = input.type.includes('bool');

  let processed = isArray || isTuple ? JSON.parse(rawValue) : rawValue;
  if (isBytes32 && !viem.isBytes(processed)) {
    if (isArray) {
      processed = processed.map((item: string) => viem.stringToHex(item));
    } else {
      processed = viem.stringToHex(processed);
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

function parseWeiValue(v: string): BigInt {
  if (v.includes('.')) {
    return viem.parseEther(v);
  } else {
    return BigInt(v);
  }
}

function printReturnedValue(output: viem.AbiParameter, value: any): string {
  if (output.type === 'tuple') {
    // handle structs
    // TODO: for some reason viem's types die here
    return '\n' + (output as any).components
      .map((comp: viem.AbiParameter, ind: number) => `${comp.name}: ${printReturnedValue(comp, value[ind])}`).join('\n');
  } else if (output.type === 'array' && Array.isArray(value)) {
    // handle arrays
    return value.map((item) => printReturnedValue((output as any).arrayChildren, item)).join(', ');
  } else if (output.type.startsWith('uint') || output.type.startsWith('int')) {
    return `${value.toString()} (${wei(value).toString(5)})`;
  } else if (output.type.startsWith('bytes')) {
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

          for (let i = 0; i < (parsedLog.args?.length || 0); i++) {
            const output = parsedLog.args![i];
            const paramType = eventAbiDef.inputs[i] as viem.AbiParameter;

            console.log(cyan(`  ↪ ${paramType.name || ''}(${paramType.type}):`), printReturnedValue(paramType, output));
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
