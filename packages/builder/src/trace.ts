import { ChainArtifacts, ContractData } from './types';
import { ConsoleLogs } from './consoleLog';
import { ethers } from 'ethers';
import { green, grey, bold } from 'chalk';

const CONSOLE_LOG_ADDRESS = '0x000000000000000000636f6e736f6c652e6c6f67';

/* eslint-disable no-case-declarations */

// geth trace types
export type CallTraceAction = {
  callType: 'staticcall' | 'delegatecall' | 'call';
  from: string;
  gas: string;
  input: string;
  to: string;
  value: string;
};

export type CreateTraceAction = {
  from: string;
  gas: string;
  init: string;
  value: string;
};

export type TraceEntry = {
  action: CreateTraceAction | CallTraceAction;
  blockHash: string;
  blockNumber: string;
  result: {
    gasUsed: string;
    code?: string;
    output: string;
  };
  subtraces: number;
  traceAddress: number[];
  transactionHash: string;
  transactionPosition: number;
  type: 'call' | 'create';
};

export function renderTrace(ctx: ChainArtifacts, traces: TraceEntry[]): string {
  return traces.map((t) => renderTraceEntry(ctx, t)).join('\n');
}

function renderTraceEntry(ctx: ChainArtifacts, trace: TraceEntry): string {
  let str;

  switch (trace.type) {
    case 'call':
      const callTraceAction = trace.action as CallTraceAction;

      const { contractName, parsedInput, parsedOutput } = parseFunctionData(
        ctx,
        callTraceAction.to,
        callTraceAction.input,
        trace.result.output
      );

      const actionStr = bold(`${callTraceAction.callType.toUpperCase()} `);
      const gasStr = grey(` (${parseInt(callTraceAction.gas).toLocaleString()} gas)`);

      const txStr =
        (contractName || callTraceAction.to) +
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
  contractAddress: string,
  input: string,
  output: string
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
        ethers.utils.defaultAbiCoder.decode(
          ConsoleLogs[parseInt(input.slice(0, 10)) as keyof typeof ConsoleLogs],
          '0x' + input.slice(10)
        )
      );

    // console logs have no output
    parsedOutput = '';
  } else {
    const info =
      findContract(ctx, ({ address, abi }) => {
        if (address.toLowerCase() === contractAddress.toLowerCase()) {
          try {
            new ethers.Contract(address, abi).interface.parseTransaction({ data: input, value: 0 });
            return true;
          } catch {
            return false;
          }
        }

        return false;
      }) || findContract(ctx, ({ address }) => address.toLowerCase() === contractAddress.toLowerCase());

    if (info) {
      contractName = info.name;

      let decodedInput: any;
      try {
        decodedInput = info.contract.interface.parseTransaction({ data: input, value: 0 })!;
        parsedInput = decodedInput.name + renderResult(decodedInput.args);

        // its actually easier to start by trying to parse the output first
        try {
          const decodedOutput = info.contract.interface.decodeFunctionResult(decodedInput.functionFragment, output)!;
          parsedOutput = renderResult(decodedOutput);
        } catch (err) {
          // if we found an address but the transaction cannot be parsed, it could be decodable error
          try {
            parsedOutput = parseContractErrorReason(info.contract, output);
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
  condition: (v: { address: string; abi: any[] }) => boolean,
  prefix = ''
): { name: string; contract: ethers.Contract } | null {
  for (const name in ctx.contracts) {
    if (condition(ctx.contracts[name])) {
      return {
        name: prefix + name,
        contract: new ethers.Contract(ctx.contracts[name].address, ctx.contracts[name].abi),
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

export function decodeTxError(data: string, abis: ContractData['abi'][] = []) {
  if (data.startsWith(ethers.utils.id('Panic(uint256)').slice(0, 10))) {
    // this is the `Panic` builtin opcode
    const reason = ethers.utils.defaultAbiCoder.decode(['uint256'], '0x' + data.slice(10))[0];
    switch (reason.toNumber()) {
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
  } else if (data.startsWith(ethers.utils.id('Error(string)').slice(0, 10))) {
    // this is the `Error` builtin opcode
    const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + data.slice(10));
    return `Error("${reason}")`;
  }
  for (const abi of abis) {
    const iface = new ethers.utils.Interface(abi as string[]);
    try {
      const error = iface.parseError(data);
      return error.name + renderResult(error.args);
    } catch (err) {
      // intentionally empty
    }
  }
  return null;
}

export function parseContractErrorReason(contract: ethers.Contract | null, data: string): string {
  const result = decodeTxError(data);

  if (result) {
    return result;
  }
  if (contract) {
    try {
      const error = contract.interface.parseError(data);
      return error.name + renderResult(error.args);
    } catch (err) {
      // intentionally empty
    }
  }

  return data;
}

export function renderResult(result: ethers.utils.Result) {
  return '(' + result.map((v) => (v.toString ? '"' + v.toString() + '"' : v)).join(', ') + ')';
}
