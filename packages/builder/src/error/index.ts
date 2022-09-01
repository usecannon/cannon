import { ethers } from 'ethers';
import { ConsoleLogs } from './consoleLog';
import { ChainArtifacts } from "../types";

const CONSOLE_LOG_ADDRESS = '0x000000000000000000636f6e736f6c652e6c6f67';

export async function handleTxnError(artifacts: ChainArtifacts, provider: ethers.providers.JsonRpcProvider, err: any): Promise<any> {

    if (err instanceof CannonTraceError) {
        // error already parsed
        throw err;
    }

    let errorData: string | null = null;
    let txnData: ethers.providers.TransactionRequest | null = null;
    let txnHash: string | null = null;

    let traces: TraceEntry[] = [];

    if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
        return handleTxnError(artifacts, provider, err.error);
    }
    if (err.reason === 'processing response error') {
        txnData = JSON.parse(err.requestBody).params[0];
        errorData = err.error.data;
    }

    if (txnData && await isAnvil(provider)) {
        const fullTxn = {
            gasLimit: 20000000, // should ensure we get an actual failed receipt
            ...txnData
        };

        if (!errorData) {
            // first, try to run the txn without 
        }
        

        // then, run it for real so we can get a trace
        try {
            await provider.send('hardhat_impersonateAccount', [fullTxn.from]);
            const pushedTxn = await provider.getSigner(fullTxn.from).sendTransaction(fullTxn);
    
            try { await pushedTxn.wait(); } catch {}
            txnHash = pushedTxn.hash;
        } catch (err) {
            console.error('warning: failed to force through transaction:', err);
        }
    }

    if (txnHash) {
        // try getting trace data
        try {
            traces = await provider.send('trace_transaction', [txnHash]);
        } catch (err) {
            console.error('warning: trace api unavailable', err);
            // TODO: trace API most likely not available
        }
    }

    throw new CannonTraceError(err, artifacts, traces);
}



interface ErrorObject {
    data?: string;
    body?: string;
    error?: ErrorObject;
}


function getErrorData(err: ErrorObject): string | null {
  if (err.data) {
    return err.data;
  }

  if (err.error) {
    return getErrorData(err.error);
  }

  return null;
}



class CannonTraceError extends Error {
    error: Error;

    constructor(error: Error, ctx: ChainArtifacts, traces: TraceEntry[]) {
        // first, try to lift up the actual error reason
        const data = getErrorData(error as ErrorObject);

        let decodedMsg = error.message;
        if (data) {
            try {
                const r = findContract(ctx, ({ address, abi }) => {
                    try {
                        new ethers.Contract(address, abi).interface.parseError(data);
                        return true;
                    } catch (_) {}
    
                    return false;
                });

                decodedMsg = parseErrorReason(r?.contract ?? null, data);
            } catch {}
        }

        // now we can make ourself a thing
        super(`transaction reverted: ${decodedMsg}\n\n${renderTrace(ctx, traces)}\n\n`);

        this.error = error;
    }
}

export type CallTraceAction = {
    callType: 'staticcall'|'delegatecall'|'call',
    from: string,
    gas: string,
    input: string,
    to: string,
    value: string
};

export type CreateTraceAction = {
    from: string,
    gas: string,
    init: string,
    value: string
};

export type TraceEntry = {
    action: CreateTraceAction|CallTraceAction,
    blockHash: string,
    blockNumber: string,
    result: {
        gasUsed: string,
        code?: string,
        output: string
    },
    subtraces: number,
    traceAddress: number[],
    transactionHash: string,
    transactionPosition: number,
    type: 'call'|'create'
}

async function isAnvil(provider: ethers.providers.JsonRpcProvider) {
    return (await provider.send('web3_clientVersion', [])).includes('anvil');
}

export function findContract(ctx: ChainArtifacts, condition: (v: { address: string, abi: any[] }) => boolean, prefix: string = ''): { name: string, contract: ethers.Contract }|null {
    for (const name in ctx.contracts) {
        if (condition(ctx.contracts[name])) {
            return {
                name: prefix + name,
                contract: new ethers.Contract(ctx.contracts[name].address, ctx.contracts[name].abi)
            }
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

export function renderResult(result: ethers.utils.Result) {
    return '(' + result.map((v) => (v.toString ? '"' + v.toString() + '"' : v)).join(', ') + ')';
}

function parseErrorReason(contract: ethers.Contract | null, data: string): string {
    if (data.startsWith(ethers.utils.id('Panic(uint256)').slice(0, 10))) {
        // this is the `Panic` builtin opcode
        const reason = ethers.utils.defaultAbiCoder.decode(['uint256'], '0x' + data.slice(10))[0];
        switch(reason.toNumber()) {
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
    } else if (contract) {
        try {
            const error = contract.interface.parseError(data);
            return error.name + renderResult(error.args);
        } catch(err) {}
    }

    return data;
}

function parseFunctionData(ctx: ChainArtifacts, contractAddress: string, input: string, output: string): {
    contractName: string,
    parsedInput: string,
    parsedOutput: string,
    isReverted: boolean,
} {

    let parsedInput: string, parsedOutput: string;
    let contractName = '';

    let isReverted = false;

    // input
    if (contractAddress.toLowerCase() == CONSOLE_LOG_ADDRESS) {
        // this is the "well known" console log address
        contractName = 'console';
        parsedInput = 'log' + renderResult(ethers.utils.defaultAbiCoder.decode(
            ConsoleLogs[parseInt(input.slice(0, 10)) as keyof typeof ConsoleLogs], '0x' + input.slice(10)));
        
        // console logs have no output
        parsedOutput = '';
    }

    else {
        const info = findContract(ctx, ({address}) => address.toLowerCase() === contractAddress.toLowerCase());
        
        if (info) {
            contractName = info.name;

            let decodedInput: any;
            try {

                decodedInput = info?.contract.interface.parseTransaction({ data: input, value: 0 })!;
                parsedInput = decodedInput.name + renderResult(decodedInput.args);

                // its actually easier to start by trying to parse the output first
                try {
                    const decodedOutput = info?.contract.interface.decodeFunctionResult(decodedInput.functionFragment, output)!;
                    parsedOutput = renderResult(decodedOutput);
                } catch (err) {
                    // if we found an address but the transaction cannot be parsed, it could be decodable error
                    try {
                        parsedOutput = parseErrorReason(info.contract, output);
                        isReverted = true;
                    } catch(err) {
                        parsedOutput = output;
                    }
                }

            } catch (err) {
                // this shouldn't happen unless the ABI is incomplete or the contract is non-conformant
                parsedInput = `<unknown function ${input.slice(0,10)}>`;
                parsedOutput = output;
            }
        }
        else {
            parsedInput = input;
            parsedOutput = output;
        }
    }

    return {
        contractName,
        parsedInput,
        parsedOutput,
        isReverted
    };
}

function renderTraceEntry(ctx: ChainArtifacts, trace: TraceEntry): string {
    let str;

    switch(trace.type) {
        case 'call':
            const callTraceAction = trace.action as CallTraceAction;

            const { contractName, parsedInput, parsedOutput, isReverted } = parseFunctionData(
                ctx, 
                callTraceAction.to, 
                callTraceAction.input,
                trace.result.output
            );

            str = callTraceAction.callType.toUpperCase() +
                ' ' + (contractName || callTraceAction.to) + 
                '.' + (parsedInput || callTraceAction.input) +
                (parsedOutput ? ' => ' + parsedOutput : '') +
                `(${parseInt(callTraceAction.gas)})`;

            break;
        case 'create':
            const createTraceAction = trace.action as CreateTraceAction;

            str = 'CREATE'; // TODO: find matching bytecode

            break;

        default:
            str = `UNKOWN ${trace.type}`;
    }

    return ' '.repeat(2 * (trace.traceAddress.length + 1)) + str;
}

export function renderTrace(ctx: ChainArtifacts, traces: TraceEntry[]): string {
    return traces.map(t => renderTraceEntry(ctx, t)).join('\n');
}