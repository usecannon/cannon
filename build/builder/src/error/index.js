var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ethers } from 'ethers';
import { ConsoleLogs } from './consoleLog';
const CONSOLE_LOG_ADDRESS = '0x000000000000000000636f6e736f6c652e6c6f67';
export function handleTxnError(artifacts, provider, err) {
    return __awaiter(this, void 0, void 0, function* () {
        if (err instanceof CannonTraceError) {
            // error already parsed
            throw err;
        }
        let errorData = null;
        let txnData = null;
        let txnHash = null;
        let traces = [];
        if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
            return handleTxnError(artifacts, provider, err.error);
        }
        if (err.reason === 'processing response error') {
            txnData = JSON.parse(err.requestBody).params[0];
            errorData = err.error.data;
        }
        if (txnData && (yield isAnvil(provider))) {
            const fullTxn = Object.assign({ gasLimit: 20000000 }, txnData);
            if (!errorData) {
                // first, try to run the txn without 
            }
            // then, run it for real so we can get a trace
            try {
                yield provider.send('hardhat_impersonateAccount', [fullTxn.from]);
                const pushedTxn = yield provider.getSigner(fullTxn.from).sendTransaction(fullTxn);
                try {
                    yield pushedTxn.wait();
                }
                catch (_a) { }
                txnHash = pushedTxn.hash;
            }
            catch (err) {
                console.error('warning: failed to force through transaction:', err);
            }
        }
        if (txnHash) {
            // try getting trace data
            try {
                traces = yield provider.send('trace_transaction', [txnHash]);
            }
            catch (err) {
                console.error('warning: trace api unavailable', err);
                // TODO: trace API most likely not available
            }
        }
        if (traces.length || txnHash || txnData) {
            throw new CannonTraceError(err, artifacts, traces);
        }
        else {
            throw err;
        }
    });
}
function getErrorData(err) {
    if (err.data) {
        return err.data;
    }
    if (err.error) {
        return getErrorData(err.error);
    }
    return null;
}
class CannonTraceError extends Error {
    constructor(error, ctx, traces) {
        var _a;
        // first, try to lift up the actual error reason
        const data = getErrorData(error);
        let decodedMsg = error.message;
        if (data) {
            try {
                const r = findContract(ctx, ({ address, abi }) => {
                    try {
                        new ethers.Contract(address, abi).interface.parseError(data);
                        return true;
                    }
                    catch (_) { }
                    return false;
                });
                decodedMsg = parseErrorReason((_a = r === null || r === void 0 ? void 0 : r.contract) !== null && _a !== void 0 ? _a : null, data);
            }
            catch (_b) { }
        }
        // now we can make ourself a thing
        super(`transaction reverted: ${decodedMsg}\n\n${renderTrace(ctx, traces)}\n\n`);
        this.error = error;
    }
}
function isAnvil(provider) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield provider.send('web3_clientVersion', [])).includes('anvil');
    });
}
export function findContract(ctx, condition, prefix = '') {
    for (const name in ctx.contracts) {
        if (condition(ctx.contracts[name])) {
            return {
                name: prefix + name,
                contract: new ethers.Contract(ctx.contracts[name].address, ctx.contracts[name].abi)
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
export function renderResult(result) {
    return '(' + result.map((v) => (v.toString ? '"' + v.toString() + '"' : v)).join(', ') + ')';
}
function parseErrorReason(contract, data) {
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
    }
    else if (data.startsWith(ethers.utils.id('Error(string)').slice(0, 10))) {
        // this is the `Error` builtin opcode
        const reason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + data.slice(10));
        return `Error("${reason}")`;
    }
    else if (contract) {
        try {
            const error = contract.interface.parseError(data);
            return error.name + renderResult(error.args);
        }
        catch (err) { }
    }
    return data;
}
function parseFunctionData(ctx, contractAddress, input, output) {
    let parsedInput, parsedOutput;
    let contractName = '';
    let isReverted = false;
    // input
    if (contractAddress.toLowerCase() == CONSOLE_LOG_ADDRESS) {
        // this is the "well known" console log address
        contractName = 'console';
        parsedInput = 'log' + renderResult(ethers.utils.defaultAbiCoder.decode(ConsoleLogs[parseInt(input.slice(0, 10))], '0x' + input.slice(10)));
        // console logs have no output
        parsedOutput = '';
    }
    else {
        const info = findContract(ctx, ({ address }) => address.toLowerCase() === contractAddress.toLowerCase());
        if (info) {
            contractName = info.name;
            let decodedInput;
            try {
                decodedInput = info === null || info === void 0 ? void 0 : info.contract.interface.parseTransaction({ data: input, value: 0 });
                parsedInput = decodedInput.name + renderResult(decodedInput.args);
                // its actually easier to start by trying to parse the output first
                try {
                    const decodedOutput = info === null || info === void 0 ? void 0 : info.contract.interface.decodeFunctionResult(decodedInput.functionFragment, output);
                    parsedOutput = renderResult(decodedOutput);
                }
                catch (err) {
                    // if we found an address but the transaction cannot be parsed, it could be decodable error
                    try {
                        parsedOutput = parseErrorReason(info.contract, output);
                        isReverted = true;
                    }
                    catch (err) {
                        parsedOutput = output;
                    }
                }
            }
            catch (err) {
                // this shouldn't happen unless the ABI is incomplete or the contract is non-conformant
                parsedInput = `<unknown function ${input.slice(0, 10)}>`;
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
function renderTraceEntry(ctx, trace) {
    let str;
    switch (trace.type) {
        case 'call':
            const callTraceAction = trace.action;
            const { contractName, parsedInput, parsedOutput, isReverted } = parseFunctionData(ctx, callTraceAction.to, callTraceAction.input, trace.result.output);
            str = callTraceAction.callType.toUpperCase() +
                ' ' + (contractName || callTraceAction.to) +
                '.' + (parsedInput || callTraceAction.input) +
                (parsedOutput ? ' => ' + parsedOutput : '') +
                `(${parseInt(callTraceAction.gas)})`;
            break;
        case 'create':
            const createTraceAction = trace.action;
            str = 'CREATE'; // TODO: find matching bytecode
            break;
        default:
            str = `UNKOWN ${trace.type}`;
    }
    return ' '.repeat(2 * (trace.traceAddress.length + 1)) + str;
}
export function renderTrace(ctx, traces) {
    return traces.map(t => renderTraceEntry(ctx, t)).join('\n');
}
