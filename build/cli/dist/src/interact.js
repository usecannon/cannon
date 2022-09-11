"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.interact = void 0;
const lodash_1 = __importDefault(require("lodash"));
const ethers_1 = require("ethers");
const chalk_1 = __importDefault(require("chalk"));
const { red, bold, gray, green, yellow, cyan } = chalk_1.default;
const prompts_1 = __importDefault(require("prompts"));
const wei_1 = require("@synthetixio/wei");
const PROMPT_BACK_OPTION = { title: '↩ BACK' };
function interact(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        // -----------------
        // Start interaction
        // -----------------
        yield printHeader(ctx);
        let pickedContract = null;
        let pickedFunction = null;
        let currentArgs = null;
        let txnValue = (0, wei_1.wei)(0);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!pickedContract) {
                pickedContract = yield pickContract({
                    contractNames: lodash_1.default.keys(ctx.contracts),
                });
                if (pickedContract == PROMPT_BACK_OPTION.title) {
                    break;
                }
                else if (!pickedContract) {
                    return null;
                }
            }
            else if (!pickedFunction) {
                yield printHelpfulInfo(ctx, pickedContract);
                pickedFunction = yield pickFunction({
                    contract: ctx.contracts[pickedContract],
                });
                if (!pickedFunction) {
                    pickedContract = null;
                }
            }
            else if (!currentArgs) {
                const argData = yield pickFunctionArgs({
                    func: ctx.contracts[pickedContract].interface.getFunction(pickedFunction),
                });
                if (!argData) {
                    pickedFunction = null;
                }
                else {
                    currentArgs = argData.args;
                    txnValue = (0, wei_1.wei)(argData.value);
                }
            }
            else {
                const contract = ctx.contracts[pickedContract];
                const functionInfo = contract.interface.getFunction(pickedFunction);
                if (functionInfo.constant || !ctx.signer) {
                    yield query({
                        contract,
                        functionSignature: pickedFunction,
                        args: currentArgs,
                        blockTag: ctx.blockTag,
                    });
                }
                else {
                    const receipt = yield execTxn({
                        signer: ctx.signer,
                        contract,
                        functionSignature: pickedFunction,
                        args: currentArgs,
                        value: txnValue.toBN(),
                    });
                    if ((receipt === null || receipt === void 0 ? void 0 : receipt.status) === 1) {
                        yield logTxSucceed(ctx, receipt);
                    }
                    else {
                        yield logTxFail('txn is null');
                    }
                }
                // return to function select
                pickedFunction = null;
                currentArgs = null;
            }
        }
    });
}
exports.interact = interact;
function printHeader(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        // retrieve balance of the signer address
        // this isnt always necessary but it serves as a nice test that the provider is working
        // and prevents the UI from lurching later if its queried later
        const signerBalance = ctx.signer ? (0, wei_1.wei)(yield ctx.signer.getBalance()) : (0, wei_1.wei)(0);
        console.log('\n');
        console.log(gray('================================================================================'));
        console.log(gray('> Gas price: provider default'));
        console.log(gray(`> Block tag: ${ctx.blockTag || 'latest'}`));
        if (ctx.signer) {
            console.log(yellow(`> Read/Write: ${yield ctx.signer.getAddress()}`));
            if (signerBalance.gt(1)) {
                console.log(green(`> Signer Balance: ${signerBalance.toString(2)}`));
            }
            else if (signerBalance.gt(0.1)) {
                console.log(yellow(`> Signer Balance: ${signerBalance.toString(4)}`));
            }
            else {
                console.log(red(`> WARNING! Low signer balance: ${signerBalance.toString(4)}`));
            }
        }
        else {
            console.log(gray('> Read Only'));
        }
        console.log(gray('================================================================================'));
        console.log('\n');
    });
}
function printHelpfulInfo(ctx, pickedContract) {
    return __awaiter(this, void 0, void 0, function* () {
        if (pickedContract) {
            console.log(gray.inverse(`${pickedContract} => ${ctx.contracts[pickedContract].address}`));
        }
        console.log(gray(`  * Signer: ${ctx.signer ? yield ctx.signer.getAddress() : 'None'}`));
        console.log('\n');
        /*console.log(gray('  * Recent contracts:'));
          for (let i = 0; i < recentContracts.length; i++) {
              const contract = recentContracts[i];
              console.log(gray(`    ${contract.name}: ${contract.address}`));
          }*/
    });
}
function pickContract({ contractNames }) {
    return __awaiter(this, void 0, void 0, function* () {
        const choices = contractNames.sort().map((s) => ({ title: s }));
        choices.unshift(PROMPT_BACK_OPTION);
        const { pickedContract } = yield prompts_1.default.prompt([
            {
                type: 'autocomplete',
                name: 'pickedContract',
                message: 'Pick a CONTRACT:',
                choices,
                suggest: suggestBySubtring,
            },
        ]);
        return pickedContract;
    });
}
function pickFunction({ contract }) {
    return __awaiter(this, void 0, void 0, function* () {
        const functionSignatures = lodash_1.default.keys(contract.functions).filter((f) => f.indexOf('(') != -1);
        const choices = functionSignatures.sort().map((s) => ({ title: s }));
        choices.unshift(PROMPT_BACK_OPTION);
        const { pickedFunction } = yield prompts_1.default.prompt([
            {
                type: 'autocomplete',
                name: 'pickedFunction',
                message: 'Pick a FUNCTION:',
                choices,
                suggest: suggestBySubtring,
            },
        ]);
        return pickedFunction == PROMPT_BACK_OPTION.title ? null : pickedFunction;
    });
}
function pickFunctionArgs({ func }) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = [];
        let value = (0, wei_1.wei)(0).toBN();
        if (func.payable) {
            const { txnValue } = yield prompts_1.default.prompt([
                {
                    type: 'number',
                    name: 'txnValue',
                    message: 'Function is payable. ETH AMOUNT (in eth units):',
                },
            ]);
            value = (0, wei_1.wei)(txnValue).toBN();
        }
        for (const input of func.inputs) {
            const rawValue = yield promptInputValue(input);
            if (!rawValue) {
                return null;
            }
            args.push(rawValue);
        }
        return { args, value };
    });
}
function query({ contract, functionSignature, args, blockTag, }) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const functionInfo = contract.interface.getFunction(functionSignature);
        let result = [];
        try {
            result = yield contract.callStatic[functionSignature](...args, {
                blockTag,
            });
        }
        catch (err) {
            console.error('failed query:', err);
            return null;
        }
        for (let i = 0; i < (((_a = functionInfo.outputs) === null || _a === void 0 ? void 0 : _a.length) || 0); i++) {
            const output = functionInfo.outputs[i];
            console.log(cyan(`  ↪ ${output.name || ''}(${output.type}):`), printReturnedValue(output, functionInfo.outputs.length > 1 ? result[i] : result));
        }
        return result;
    });
}
function execTxn({ contract, functionSignature, args, value, signer, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const callData = contract.interface.encodeFunctionData(functionSignature, args);
        let txn = {};
        // estimate gas
        try {
            txn = yield contract.populateTransaction[functionSignature](...args, {
                from: yield signer.getAddress(),
            });
            const estimatedGas = yield contract.estimateGas[functionSignature](...args, {
                from: yield signer.getAddress(),
            });
            console.log(gray(`  > calldata: ${txn.data}`));
            console.log(gray(`  > estimated gas required: ${estimatedGas}`));
            console.log(gray(`  > gas: ${JSON.stringify(lodash_1.default.pick(txn, 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas'))}`));
            console.log(green(bold('  ✅ txn will succeed')));
        }
        catch (err) {
            console.error(red('Error: Could not populate transaction (is it failing?)'));
        }
        if (signer != null) {
            const { confirmation } = yield prompts_1.default.prompt([
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
                txInfo = yield signer.sendTransaction({
                    to: contract.address,
                    data: callData,
                    value: ethers_1.ethers.BigNumber.from(value),
                });
                console.log('> hash: ', txInfo.hash);
                console.log('confirming...');
                const receipt = yield txInfo.wait();
                return receipt;
            }
            catch (err) {
                logTxFail(err);
                return null;
            }
        }
        else {
            console.log('not submitting transaction because in read-only mode');
        }
    });
}
function promptInputValue(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = input.name || input.type;
        const message = input.name ? `${input.name} (${input.type})` : input.type;
        for (let i = 0; i < 5; i++) {
            try {
                const answer = yield prompts_1.default.prompt([
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
            }
            catch (err) {
                console.error('invalid input: ', err);
            }
        }
    });
}
function parseInput(input, rawValue) {
    const requiresBytes32Util = input.type.includes('bytes32');
    const isArray = input.type.includes('[]');
    const isNumber = input.type.includes('int');
    let processed = isArray ? JSON.parse(rawValue) : rawValue;
    if (requiresBytes32Util) {
        if (isArray) {
            processed = processed.map((item) => ethers_1.ethers.utils.formatBytes32String(item));
        }
        else {
            processed = ethers_1.ethers.utils.formatBytes32String(processed);
        }
    }
    if (isNumber) {
        if (isArray) {
            processed = processed.map((item) => parseWeiValue(item));
        }
        else {
            processed = parseWeiValue(processed);
        }
    }
    if (isArray) {
        processed = processed.map((value) => boolify(value));
    }
    else {
        processed = boolify(processed);
    }
    //const processed = preprocessInput(input, type, hre);
    if (processed !== rawValue) {
        console.log(gray(`  > processed inputs (${isArray ? processed.length : '1'}):`, processed));
    }
    // Encode user's input to validate it
    ethers_1.ethers.utils.defaultAbiCoder.encode([input.type], [processed]);
    return processed;
}
function parseWeiValue(v) {
    if (v.includes('.')) {
        return (0, wei_1.wei)(v).toBN();
    }
    else {
        return (0, wei_1.wei)(v, 0, true).toBN();
    }
}
function printReturnedValue(output, value) {
    if ((output === null || output === void 0 ? void 0 : output.baseType) === 'tuple') {
        // handle structs
        return '\n' + (output === null || output === void 0 ? void 0 : output.components.map((comp, ind) => `${comp.name}: ${printReturnedValue(comp, value[ind])}`).join('\n'));
    }
    else if ((output === null || output === void 0 ? void 0 : output.baseType) === 'array' && Array.isArray(value)) {
        // handle arrays
        return value.map((item) => printReturnedValue(output.arrayChildren, item)).join(', ');
    }
    else if ((output === null || output === void 0 ? void 0 : output.type.startsWith('uint')) || (output === null || output === void 0 ? void 0 : output.type.startsWith('int'))) {
        return `${value.toString()} (${(0, wei_1.wei)(value).toString(5)})`;
    }
    else if (output === null || output === void 0 ? void 0 : output.type.startsWith('bytes')) {
        return `${value} (${Buffer.from(value.slice(2), 'hex').toString('utf8')})`;
    }
    else {
        return value;
    }
}
// Avoid 'false' and '0' being interpreted as bool = true
function boolify(value) {
    if (value === 'false' || value === '0')
        return 0;
    return value;
}
function logTxSucceed(ctx, receipt) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(green('  ✅ Success'));
        // console.log('receipt', JSON.stringify(receipt, null, 2));
        // Print tx hash
        console.log(gray(`    tx hash: ${receipt.transactionHash}`));
        // Print gas used
        console.log(gray(`    gas used: ${receipt.gasUsed.toString()}`));
        // Print emitted events
        if (receipt.logs && receipt.logs.length > 0) {
            const contractsByAddress = lodash_1.default.keyBy(ctx.contracts, 'address');
            for (let i = 0; i < receipt.logs.length; i++) {
                const log = receipt.logs[i];
                try {
                    // find contract matching address of the log
                    const logContract = contractsByAddress[log.address];
                    const parsedLog = logContract.interface.parseLog(log);
                    console.log(gray(`    log ${i}:`), cyan(parsedLog.name));
                    for (let i = 0; i < (parsedLog.args.length || 0); i++) {
                        const output = parsedLog.args[i];
                        const paramType = logContract.interface.getEvent(parsedLog.name).inputs[i];
                        console.log(cyan(`  ↪ ${output.name || ''}(${output.type}):`), printReturnedValue(paramType, output));
                    }
                }
                catch (err) {
                    console.log(gray(`    log ${i}: unable to decode log - ${JSON.stringify(log)}`));
                }
            }
        }
    });
}
function logTxFail(error) {
    console.log(red('  ❌ Error'));
    function findReason(error) {
        if (typeof error === 'string') {
            return error;
        }
        else {
            if (error.hasOwn('reason')) {
                return error.reason;
            }
            else if (error.hasOwn('error')) {
                return findReason(error.error);
            }
        }
        return error.toString();
    }
    const reason = findReason(error);
    if (reason)
        console.log(red(`    Reason: ${reason}`));
    console.log(gray(JSON.stringify(error, null, 2)));
}
// filters choices by subtrings that don't have to be continuous e.g. 'ybtc' will match 'SynthsBTC'
const suggestBySubtring = (input, choices) => Promise.resolve(choices.filter((choice) => {
    const titleStr = choice.title.toLowerCase();
    let index = 0;
    for (const c of input.toLowerCase()) {
        index = titleStr.indexOf(c, index);
        if (index === -1) {
            return false; // not found
        }
        else {
            index += 1; // start from next index
        }
    }
    return true;
}));
