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
const util_1 = require('../util');
const ethers_1 = require('ethers');
const debug = (0, debug_1.default)('cannon:builder:invoke');
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
                    artifact: { type: 'string' },
                },
                optionalProperties: {
                    constructorArgs: { elements: {} },
                },
            },
        },
        depends: { elements: { type: 'string' } },
    },
};
function runTxn(runtime, config, contract, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        let txn;
        if (config.fromCall) {
            debug('resolve from address', contract.address);
            const address = yield contract
                .connect(runtime.provider)[config.fromCall.func](...(((_a = config.fromCall) === null || _a === void 0 ? void 0 : _a.args) || []));
            debug('owner for call', address);
            const callSigner = yield runtime.getSigner(address);
            txn = yield contract.connect(callSigner)[config.func](...(config.args || []));
        }
        else {
            txn = yield contract.connect(signer)[config.func](...(config.args || []));
        }
        const receipt = yield txn.wait();
        // get events
        const txnEvents = lodash_1.default.groupBy(lodash_1.default.filter((_b = receipt.events) === null || _b === void 0
            ? void 0
            : _b.map((e) => {
                if (!e.event || !e.args) {
                    return null;
                }
                return {
                    name: e.event,
                    args: e.args,
                };
            }), lodash_1.default.isObject), 'name');
        return [receipt, txnEvents];
    });
}
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
exports.default = {
    validate: config,
    getState(_runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.configInject(ctx, config);
        });
    },
    configInject(ctx, config) {
        config = lodash_1.default.cloneDeep(config);
        if (config.target) {
            config.target = config.target.map((v) => lodash_1.default.template(v)(ctx));
        }
        if (config.abi) {
            config.abi = lodash_1.default.template(config.abi)(ctx);
        }
        config.func = lodash_1.default.template(config.func)(ctx);
        if (config.args) {
            config.args = lodash_1.default.map(config.args, (a) => {
                return typeof a == 'string' ? lodash_1.default.template(a)(ctx) : a;
            });
        }
        if (config.from) {
            config.from = lodash_1.default.template(config.from)(ctx);
        }
        if (config.fromCall) {
            config.fromCall.func = lodash_1.default.template(config.fromCall.func)(ctx);
            config.fromCall.args = lodash_1.default.map(config.fromCall.args, (a) => {
                return typeof a == 'string' ? lodash_1.default.template(a)(ctx) : a;
            });
        }
        for (const name in config.factory) {
            const f = config.factory[name];
            f.event = lodash_1.default.template(f.event)(ctx);
            f.artifact = lodash_1.default.template(f.artifact)(ctx);
        }
        return config;
    },
    exec(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            debug('exec', config);
            const txns = {};
            const mainSigner = config.from ? yield runtime.getSigner(config.from) : yield runtime.getDefaultSigner({}, '');
            for (const t of config.target || []) {
                let contract;
                if (ethers_1.ethers.utils.isAddress(t)) {
                    if (!config.abi) {
                        throw new Error('abi must be defined if addresses is used for target');
                    }
                    contract = new ethers_1.ethers.Contract(t, JSON.parse(config.abi));
                }
                else {
                    contract = (0, util_1.getContractFromPath)(ctx, t);
                }
                if (!contract) {
                    throw new Error(`field on: contract with identifier '${t}' not found. The valid list of recognized contracts is:`);
                }
                const [receipt, txnEvents] = yield runTxn(runtime, config, contract, mainSigner);
                const currentLabel = (_a = runtime.currentLabel) === null || _a === void 0 ? void 0 : _a.split('.')[1];
                const label = ((_b = config.target) === null || _b === void 0 ? void 0 : _b.length) === 1
                    ? currentLabel || ''
                    : `${currentLabel}_${t}`;
                txns[label] = {
                    hash: receipt.transactionHash,
                    events: txnEvents,
                };
            }
            const contracts = {};
            if (config.factory) {
                for (const n in txns) {
                    for (const [name, factory] of Object.entries(config.factory)) {
                        const abi = (yield runtime.getArtifact(factory.artifact)).abi;
                        const events = lodash_1.default.entries(txns[n].events[factory.event]);
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
                                abi: abi,
                                deployTxnHash: txns[n].hash,
                                constructorArgs: factory.constructorArgs,
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
