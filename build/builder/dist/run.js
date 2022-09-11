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
var __createBinding = (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
            if (k2 === undefined)
                k2 = k;
            var desc = Object.getOwnPropertyDescriptor(m, k);
            if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                desc = {
                    enumerable: true,
                    get: function () {
                        return m[k];
                    },
                };
            }
            Object.defineProperty(o, k2, desc);
        }
        : function (o, m, k, k2) {
            if (k2 === undefined)
                k2 = k;
            o[k2] = m[k];
        });
var __setModuleDefault = (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
            Object.defineProperty(o, 'default', { enumerable: true, value: v });
        }
        : function (o, v) {
            o['default'] = v;
        });
var __importStar = (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault = (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const lodash_1 = __importDefault(require('lodash'));
const debug_1 = __importDefault(require('debug'));
const path_1 = require('path');
const util_1 = require('./util');
const debug = (0, debug_1.default)('cannon:builder:run');
const config = {
    properties: {
        exec: { type: 'string' },
        func: { type: 'string' },
        modified: { elements: { type: 'string' } },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } },
        step: { type: 'int32' },
    },
};
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
exports.default = {
    validate: config,
    getState(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!runtime.baseDir) {
                return null; // skip consistency check
                // todo: might want to do consistency check for config but not files, will see
            }
            const newConfig = this.configInject(ctx, config);
            const auxHashes = newConfig.modified.map((pathToScan) => {
                return (0, util_1.hashFs)(pathToScan).toString('hex');
            });
            // also hash the executed file itself
            auxHashes.push(newConfig.exec);
            return {
                auxHashes,
                config: newConfig,
            };
        });
    },
    configInject(ctx, config) {
        config = lodash_1.default.cloneDeep(config);
        config.exec = lodash_1.default.template(config.exec)(ctx);
        config.modified = lodash_1.default.map(config.modified, (v) => {
            return lodash_1.default.template(v)(ctx);
        });
        if (config.args) {
            config.args = lodash_1.default.map(config.args, (v) => {
                return lodash_1.default.template(v)(ctx);
            });
        }
        if (config.env) {
            config.env = lodash_1.default.map(config.env, (v) => {
                return lodash_1.default.template(v)(ctx);
            });
        }
        return config;
    },
    exec(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('exec', config);
            if (!runtime.baseDir) {
                throw new Error('run steps cannot be executed outside of their original project directory. This is likely a misconfiguration upstream.');
            }
            const runfile = yield Promise.resolve().then(() => __importStar(require((0, path_1.join)(runtime.baseDir, config.exec))));
            const outputs = yield runfile[config.func](runtime, ...(config.args || []));
            if (!outputs.contracts) {
                throw new Error('deployed contracts/txns not returned from script. Please supply any deployed contract in contracts property of returned json. If no contracts were deployed, return an empty object.');
            }
            return outputs;
        });
    },
};
