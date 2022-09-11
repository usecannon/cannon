'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const lodash_1 = __importDefault(require('lodash'));
const debug_1 = __importDefault(require('debug'));
const ethers_1 = require('ethers');
const debug = (0, debug_1.default)('cannon:builder:contract');
const config = {
    properties: {
        artifact: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: {} },
        libraries: { values: { type: 'string' } },
        step: { type: 'int32' },
        // used to force new copy of a contract (not actually used)
        salt: { type: 'string' },
    },
};
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
exports.default = {
    validate: config,
    getState(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedConfig = this.configInject(ctx, config);
            return {
                bytecode: (yield runtime.getArtifact(parsedConfig.artifact)).bytecode,
                config: parsedConfig,
            };
        });
    },
    configInject(ctx, config) {
        config = lodash_1.default.cloneDeep(config);
        config.artifact = lodash_1.default.template(config.artifact)(ctx);
        if (config.args) {
            config.args = config.args.map((a) => {
                return typeof a == 'string' ? lodash_1.default.template(a)(ctx) : a;
            });
        }
        if (config.libraries) {
            config.libraries = lodash_1.default.mapValues(config.libraries, (a) => {
                return lodash_1.default.template(a)(ctx);
            });
        }
        if (config.salt) {
            config.salt = lodash_1.default.template(config.salt)(ctx);
        }
        return config;
    },
    exec(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            debug('exec', config);
            const artifactData = yield runtime.getArtifact(config.artifact);
            let injectedBytecode = artifactData.bytecode;
            for (const file in artifactData.linkReferences) {
                for (const lib in artifactData.linkReferences[file]) {
                    // get the lib from the config
                    const libraryAddress = lodash_1.default.get(config, `libraries.${lib}`);
                    if (!libraryAddress) {
                        throw new Error(`library for contract ${config.artifact} not defined: ${lib}`);
                    }
                    debug('lib ref', lib, libraryAddress);
                    // afterwards, inject link references
                    const linkReferences = artifactData.linkReferences[file][lib];
                    for (const ref of linkReferences) {
                        injectedBytecode =
                            injectedBytecode.substr(0, 2 + ref.start * 2) +
                                libraryAddress.substr(2) +
                                injectedBytecode.substr(2 + (ref.start + ref.length) * 2);
                    }
                }
            }
            // finally, deploy
            const factory = new ethers_1.ethers.ContractFactory(artifactData.abi, injectedBytecode);
            const txn = factory.getDeployTransaction(...(config.args || []));
            const signer = yield runtime.getDefaultSigner(txn, config.salt);
            const txnData = yield signer.sendTransaction(txn);
            const receipt = yield txnData.wait();
            return {
                contracts: {
                    [((_a = runtime.currentLabel) === null || _a === void 0 ? void 0 : _a.split('.')[1]) || '']: {
                        address: receipt.contractAddress,
                        abi: JSON.parse(factory.interface.format(ethers_1.ethers.utils.FormatTypes.json)),
                        constructorArgs: config.args || [],
                        deployTxnHash: receipt.transactionHash,
                    },
                },
            };
        });
    },
};
