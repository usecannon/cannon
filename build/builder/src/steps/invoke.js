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
import { getContractFromPath } from '../util';
import { ethers } from 'ethers';
import { getAllContractPaths } from '../util';
const debug = Debug('cannon:builder:invoke');
const config = {
    properties: {
        func: { type: 'string' },
    },
    optionalProperties: {
        target: { elements: { type: 'string' } },
        abi: { type: 'string' },
        args: { elements: {} },
        from: { type: 'string' },
        fromCall: {
            properties: {
                func: { type: 'string' },
            },
            optionalProperties: {
                args: { elements: {} },
            },
        },
        factory: {
            values: {
                properties: {
                    event: { type: 'string' },
                    arg: { type: 'int32' },
                },
                optionalProperties: {
                    artifact: { type: 'string' },
                    abiOf: { type: 'string' },
                    constructorArgs: { elements: {} },
                },
            },
        },
        depends: { elements: { type: 'string' } },
    },
};
function runTxn(runtime, config, contract, signer) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let txn;
        // sanity check the contract we are calling has code defined
        // we check here because a missing contract will not revert when provided with data, leading to confusing situations
        // if invoke calls succeeding when no action was actually performed.
        if ((yield runtime.provider.getCode(contract.address)) === '0x') {
            throw new Error(`contract ${contract.address} for ${runtime.currentLabel} has no bytecode. This is most likely a missing dependency or bad state.`);
        }
        if (config.fromCall) {
            debug('resolve from address', contract.address);
            const address = yield contract.connect(runtime.provider)[config.fromCall.func](...(((_a = config.fromCall) === null || _a === void 0 ? void 0 : _a.args) || []));
            debug('owner for call', address);
            const callSigner = yield runtime.getSigner(address);
            txn = yield contract.connect(callSigner)[config.func](...(config.args || []));
        }
        else {
            txn = yield contract.connect(signer)[config.func](...(config.args || []));
        }
        const receipt = yield txn.wait();
        // get events
        const txnEvents = _.groupBy(_.filter((_b = receipt.events) === null || _b === void 0 ? void 0 : _b.map((e) => {
            if (!e.event || !e.args) {
                return null;
            }
            return {
                name: e.event,
                args: e.args,
            };
        }), _.isObject), 'name');
        return [receipt, txnEvents];
    });
}
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
    validate: config,
    getState(_runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.configInject(ctx, config);
        });
    },
    configInject(ctx, config) {
        config = _.cloneDeep(config);
        if (config.target) {
            config.target = config.target.map((v) => _.template(v)(ctx));
        }
        if (config.abi) {
            config.abi = _.template(config.abi)(ctx);
        }
        config.func = _.template(config.func)(ctx);
        if (config.args) {
            config.args = _.map(config.args, (a) => {
                return typeof a == 'string' ? _.template(a)(ctx) : a;
            });
        }
        if (config.from) {
            config.from = _.template(config.from)(ctx);
        }
        if (config.fromCall) {
            config.fromCall.func = _.template(config.fromCall.func)(ctx);
            config.fromCall.args = _.map(config.fromCall.args, (a) => {
                return typeof a == 'string' ? _.template(a)(ctx) : a;
            });
        }
        for (const name in config.factory) {
            const f = config.factory[name];
            f.event = _.template(f.event)(ctx);
            if (f.artifact) {
                f.artifact = _.template(f.artifact)(ctx);
            }
            if (f.abiOf) {
                f.abiOf = _.template(f.abiOf)(ctx);
            }
        }
        return config;
    },
    exec(runtime, ctx, config) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            debug('exec', config);
            const txns = {};
            const mainSigner = config.from
                ? yield runtime.getSigner(config.from)
                : yield runtime.getDefaultSigner({}, '');
            for (const t of config.target || []) {
                let contract;
                if (ethers.utils.isAddress(t)) {
                    if (!config.abi) {
                        throw new Error('abi must be defined if addresses is used for target');
                    }
                    contract = new ethers.Contract(t, JSON.parse(config.abi));
                }
                else {
                    contract = getContractFromPath(ctx, t);
                }
                if (!contract) {
                    throw new Error(`field "target": contract with name '${t}' not found. The valid list of recognized contracts is:
${getAllContractPaths(ctx).join('\n')}`);
                }
                const [receipt, txnEvents] = yield runTxn(runtime, config, contract, mainSigner);
                const currentLabel = (_a = runtime.currentLabel) === null || _a === void 0 ? void 0 : _a.split('.')[1];
                const label = ((_b = config.target) === null || _b === void 0 ? void 0 : _b.length) === 1 ? currentLabel || '' : `${currentLabel}_${t}`;
                txns[label] = {
                    hash: receipt.transactionHash,
                    events: txnEvents,
                    deployedOn: runtime.currentLabel,
                };
            }
            const contracts = {};
            if (config.factory) {
                for (const n in txns) {
                    for (const [name, factory] of Object.entries(config.factory)) {
                        let abi;
                        let sourceName;
                        let contractName;
                        if (factory.artifact) {
                            const artifact = yield runtime.getArtifact(factory.artifact);
                            abi = artifact.abi;
                            sourceName = artifact.sourceName;
                            contractName = artifact.contractName;
                        }
                        else if (factory.abiOf) {
                            const implContract = getContractFromPath(ctx, factory.abiOf);
                            if (!implContract) {
                                throw new Error(`previously deployed contract with name ${factory.abiOf} for factory not found`);
                            }
                            abi = JSON.parse(implContract.interface.format(ethers.utils.FormatTypes.json));
                            sourceName = ''; // TODO: might cause a problem, might be able to load from the resolved contract itself. update `getContractFromPath`
                            contractName = '';
                        }
                        else {
                            throw new Error(`factory "${name}" must specify at least one of "artifact" or "abiOf" to resolve the contract ABI for the created contract`);
                        }
                        const events = _.entries(txns[n].events[factory.event]);
                        for (const [i, e] of events) {
                            const addr = e.args[factory.arg];
                            if (!addr) {
                                throw new Error(`address was not resolvable in ${factory.event}. Ensure "arg" parameter is correct`);
                            }
                            let label = name;
                            if ((config.target || []).length > 1) {
                                label += '_' + n;
                            }
                            if (events.length > 1) {
                                label += '_' + i;
                            }
                            contracts[label] = {
                                address: addr,
                                abi,
                                deployTxnHash: txns[n].hash,
                                constructorArgs: factory.constructorArgs,
                                sourceName: sourceName,
                                contractName: contractName,
                                deployedOn: runtime.currentLabel,
                            };
                        }
                    }
                }
            }
            return {
                contracts,
                txns,
            };
        });
    },
};
