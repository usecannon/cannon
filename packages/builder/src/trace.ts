import { ChainArtifacts, Contract, ContractData } from './types';
import { ConsoleLogs } from './consoleLog';
import * as viem from 'viem';
import { Abi, Address, Hash, Hex, decodeAbiParameters } from 'viem';
import { green, grey, bold, red } from 'chalk';

export const CONSOLE_LOG_ADDRESS = '0x000000000000000000636f6e736f6c652e6c6f67';

/* eslint-disable no-case-declarations */

// geth trace types
export type CallTraceAction = {
  callType: 'staticcall' | 'delegatecall' | 'call';
  from: Address;
  gas: string;
  input: Hex;
  to: Address;
  value: string;
};

export type CreateTraceAction = {
  from: Address;
  gas: string;
  init: string;
  value: string;
};

export type TraceEntry = {
  action: CreateTraceAction | CallTraceAction;
  blockHash: string;
  blockNumber: string;
  result?: {
    gasUsed: string;
    code?: string;
    output: Hex;
  };
  subtraces: number;
  traceAddress: number[];
  transactionHash: Hash;
  transactionPosition: number;
  type: 'call' | 'create';
};

export function renderTrace(ctx: ChainArtifacts, traces: TraceEntry[]): string {
  return traces.map((t) => renderTraceEntry(ctx, t)).join('\n');
}

export function renderTraceEntry(ctx: ChainArtifacts, trace: TraceEntry): string {
  let str;

  switch (trace.type) {
    case 'call':
      const callTraceAction = trace.action as CallTraceAction;

      const { contractName, parsedInput, parsedOutput } = parseFunctionData(
        ctx,
        callTraceAction.to,
        callTraceAction.input,
        trace.result?.output ?? '0x'
      );

      const actionStr = bold(`${callTraceAction.callType.toUpperCase()} `);
      const gasStr = grey(` (${parseInt(callTraceAction.gas).toLocaleString()} gas)`);

      const txStr =
        (contractName || callTraceAction.to) +
        '.' +
        (parsedInput || callTraceAction.input) +
        (parsedOutput ? ' => ' + parsedOutput : '');

      str = actionStr + (contractName ? green(txStr) : txStr) + gasStr;
      break;
    case 'create':
      //const createTraceAction = trace.action as CreateTraceAction;

      str = 'CREATE'; // TODO: find matching bytecode

      break;

    default:
      str = `UNKNOWN ${trace.type}`;
  }

  return ' '.repeat(2 * (trace.traceAddress.length + 1)) + str;
}

export function parseFunctionData(
  ctx: ChainArtifacts,
  contractAddress: Address,
  input: Hex,
  output: Hex
): {
  contractName: string;
  parsedInput: string;
  parsedOutput: string;
  isReverted: boolean;
} {
  let parsedInput: string, parsedOutput: string;
  let contractName = '';

  let isReverted = false;

  // input
  if (contractAddress.toLowerCase() == CONSOLE_LOG_ADDRESS) {
    // this is the "well known" console log address
    contractName = 'console';
    parsedInput =
      'log' +
      renderResult(
        decodeAbiParameters(
          ConsoleLogs[parseInt(input.slice(0, 10)) as keyof typeof ConsoleLogs].map((v) => ({ type: v })),
          ('0x' + input.slice(10)) as Hex
        )
      );

    // console logs have no output
    parsedOutput = '';
  } else {
    const info =
      findContract(ctx, (contract) => {
        if (viem.isAddressEqual(contract.address, contractAddress)) {
          try {
            viem.decodeFunctionData({ ...contract, data: input });
            return true;
          } catch {
            return false;
          }
        }

        return false;
      }) || findContract(ctx, ({ address }) => address.toLowerCase() === contractAddress.toLowerCase());

    if (info) {
      contractName = info.name;

      let decodedInput: { functionName: string; args: readonly any[] | undefined };
      try {
        decodedInput = viem.decodeFunctionData({ ...info.contract, data: input });
        parsedInput = decodedInput.functionName + renderResult(decodedInput.args || []);

        // its actually easier to start by trying to parse the output first
        try {
          const abiItem = viem.getAbiItem({ ...info.contract, name: decodedInput.functionName }) as viem.AbiFunction;
          const decodedOutput = viem.decodeFunctionResult({
            abi: [abiItem],
            data: output,
          })!;
          parsedOutput = renderResult(abiItem.outputs.length > 1 ? decodedOutput : [decodedOutput]);
        } catch (err) {
          // if we found an address but the transaction cannot be parsed, it could be decodable error
          try {
            parsedOutput = bold(red(parseContractErrorReason(info.contract, output)));
            isReverted = true;
          } catch (err) {
            parsedOutput = output;
          }
        }
      } catch (err) {
        // this shouldn't happen unless the ABI is incomplete or the contract is non-conformant
        parsedInput = `<unknown function ${input.slice(0, 10)}>`;
        parsedOutput = output;
      }
    } else {
      parsedInput = input;
      parsedOutput = output;
    }
  }

  return {
    contractName,
    parsedInput,
    parsedOutput,
    isReverted,
  };
}

export function findContract(
  ctx: ChainArtifacts,
  condition: (v: { address: Address; abi: Abi }) => boolean,
  prefix = ''
): { name: string; contract: Contract } | null {
  for (const name in ctx.contracts) {
    if (condition(ctx.contracts[name])) {
      return {
        name: prefix + name,
        contract: ctx.contracts[name],
      };
    }
  }

  for (const name in ctx.imports) {
    const result = findContract(ctx.imports[name], condition, `${prefix}${name}.`);
    if (result) {
      return result;
    }
  }

  return null;
}

// TODO: viem probably makes most of this code unnecessary now
export function decodeTxError(data: Hex, abis: ContractData['abi'][] = []) {
  if (data.startsWith(viem.toFunctionSelector('Panic(uint256)'))) {
    // this is the `Panic` builtin opcode
    const reason = viem.decodeAbiParameters(viem.parseAbiParameters('uint256'), ('0x' + data.slice(10)) as Hex)[0];
    switch (Number(reason)) {
      case 0x00:
        return 'Panic("generic/unknown error")';
      case 0x01:
        return 'Panic("assertion failed")';
      case 0x11:
        return 'Panic("unchecked underflow/overflow")';
      case 0x12:
        return 'Panic("division by zero")';
      case 0x21:
        return 'Panic("invalid number to enum conversion")';
      case 0x22:
        return 'Panic("access to incorrect storage byte array")';
      case 0x31:
        return 'Panic("pop() empty array")';
      case 0x32:
        return 'Panic("out of bounds array access")';
      case 0x41:
        return 'Panic("out of memory")';
      case 0x51:
        return 'Panic("invalid internal function")';
      default:
        return 'Panic("unknown")';
    }
  } else if (data.startsWith(viem.toFunctionSelector('Error(string)'))) {
    // this is the `Error` builtin opcode
    const reason = viem.decodeAbiParameters(viem.parseAbiParameters('string'), ('0x' + data.slice(10)) as Hex);
    return `Error("${reason}")`;
  }
  for (const abi of abis) {
    try {
      const error = viem.decodeErrorResult({ data, abi });
      return error.errorName + renderResult((error.args as any[]) || []);
    } catch (err) {
      // intentionally empty
    }
  }
  return null;
}

export function parseContractErrorReason(contract: Contract | null, data: Hex): string {
  const result = decodeTxError(data);

  if (result) {
    return result;
  }
  if (contract) {
    try {
      const error = viem.decodeErrorResult({ data, ...contract });
      return error.errorName + renderResult((error.args as any[]) || []);
    } catch (err) {
      // intentionally empty
    }
  }

  return data;
}

export function renderResult(result: readonly any[]) {
  return (
    '(' +
    result
      .map((v) => {
        if (typeof v === 'object') {
          return JSON.stringify(v);
        } else {
          return v.toString ? '"' + v.toString() + '"' : v;
        }
      })
      .join(', ') +
    ')'
  );
}
