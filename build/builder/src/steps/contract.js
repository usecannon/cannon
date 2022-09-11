var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _ from 'lodash';
import Debug from 'debug';
import { ethers } from 'ethers';
import { getContractFromPath } from '../util';
const debug = Debug('cannon:builder:contract');
const config = {
    properties: {
        artifact: { type: 'string' },
    },
    optionalProperties: {
        abi: { type: 'string' },
        args: { elements: {} },
        libraries: { values: { type: 'string' } },
        // used to force new copy of a contract (not actually used)
        salt: { type: 'string' },
        depends: { elements: { type: 'string' } },
    },
};
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
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
        config = _.cloneDeep(config);
        config.artifact = _.template(config.artifact)(ctx);
        config.abi = _.template(config.abi)(ctx);
        if (config.args) {
            config.args = config.args.map((a) => {
                return typeof a == 'string' ? _.template(a)(ctx) : a;
            });
        }
        if (config.libraries) {
            config.libraries = _.mapValues(config.libraries, (a) => {
                return _.template(a)(ctx);
            });
        }
        if (config.salt) {
            config.salt = _.template(config.salt)(ctx);
        }
        return config;
    },
    exec(runtime, ctx, config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('exec', config);
            const artifactData = yield runtime.getArtifact(config.artifact);
            let injectedBytecode = artifactData.bytecode;
            for (const file in artifactData.linkReferences) {
                for (const lib in artifactData.linkReferences[file]) {
                    // get the lib from the config
                    const libraryAddress = _.get(config, `libraries.${lib}`);
                    if (!libraryAddress) {
                        throw new Error(`library for contract ${config.artifact} not defined: ${lib}`);
                    }
                    // sanity check the library we are linking to has code defined
                    if ((yield runtime.provider.getCode(libraryAddress)) === '0x') {
                        throw new Error(`library ${lib} for contract ${config.artifact} has no bytecode. This is most likely a missing dependency or bad state.`);
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
            const factory = new ethers.ContractFactory(artifactData.abi, injectedBytecode);
            const txn = factory.getDeployTransaction(...(config.args || []));
            const signer = yield runtime.getDefaultSigner(txn, config.salt);
            const txnData = yield signer.sendTransaction(txn);
            const receipt = yield txnData.wait();
            let abi = JSON.parse(factory.interface.format(ethers.utils.FormatTypes.json));
            // override abi?
            if (config.abi) {
                const implContract = getContractFromPath(ctx, config.abi);
                if (!implContract) {
                    throw new Error(`previously deployed contract with name ${config.abi} for abi not found`);
                }
                abi = JSON.parse(implContract.interface.format(ethers.utils.FormatTypes.json));
            }
            debug('contract deployed to address', receipt.contractAddress);
            return {
                contracts: {
                    [((_a = runtime.currentLabel) === null || _a === void 0 ? void 0 : _a.split('.')[1]) || '']: {
                        address: receipt.contractAddress,
                        abi,
                        constructorArgs: config.args || [],
                        deployTxnHash: receipt.transactionHash,
                        sourceName: artifactData.sourceName,
                        contractName: artifactData.contractName,
                        deployedOn: runtime.currentLabel,
                    },
                },
            };
        });
    },
};
