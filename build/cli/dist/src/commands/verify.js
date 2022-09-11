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
exports.verify = void 0;
const builder_1 = require("@usecannon/builder");
const untildify_1 = __importDefault(require("untildify"));
const helpers_1 = require("../helpers");
const params_1 = require("../util/params");
function verify(packageRef, apiKey, network, cannonDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        yield (0, helpers_1.setupAnvil)();
        const { name, version } = (0, params_1.parsePackageRef)(packageRef);
        cannonDirectory = (0, untildify_1.default)(cannonDirectory);
        const chainId = (0, helpers_1.getChainId)(network);
        const builder = new builder_1.ChainBuilder({
            name,
            version,
            readMode: 'metadata',
            chainId: chainId,
            savedPackagesDir: cannonDirectory,
            provider: {},
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getSigner(_) {
                return __awaiter(this, void 0, void 0, function* () {
                    return new Promise(() => {
                        return null;
                    });
                });
            },
        });
        const outputs = yield builder.getOutputs();
        if (!outputs) {
            throw new Error('No chain outputs found. Has the requested chain already been built?');
        }
        for (const c in outputs.contracts) {
            console.log('Verifying contract:', c);
            try {
                const constructorArgs = (_a = outputs.contracts[c].constructorArgs) === null || _a === void 0 ? void 0 : _a.map((arg) => `"${arg}"`).join(' '); // might need to prepend the constructor signature
                yield (0, helpers_1.execPromise)(`forge verify-contract --chain-id ${chainId} --constructor-args $(cast abi-encode ${constructorArgs} ${outputs.contracts[c].address} ${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName} ${apiKey}`);
            }
            catch (err) {
                if (err.message.includes('Already Verified')) {
                    console.log('Already verified');
                }
                else {
                    throw err;
                }
            }
        }
    });
}
exports.verify = verify;
