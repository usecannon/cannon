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
import { join } from 'path';
import { hashFs } from '../util';
const debug = Debug('cannon:builder:run');
const config = {
    properties: {
        exec: { type: 'string' },
        func: { type: 'string' },
        modified: { elements: { type: 'string' } },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } },
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
            if (!runtime.baseDir) {
                return null; // skip consistency check
                // todo: might want to do consistency check for config but not files, will see
            }
            const newConfig = this.configInject(ctx, config);
            const auxHashes = newConfig.modified.map((pathToScan) => {
                return hashFs(pathToScan).toString('hex');
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
        config = _.cloneDeep(config);
        config.exec = _.template(config.exec)(ctx);
        config.modified = _.map(config.modified, (v) => {
            return _.template(v)(ctx);
        });
        if (config.args) {
            config.args = _.map(config.args, (v) => {
                return _.template(v)(ctx);
            });
        }
        if (config.env) {
            config.env = _.map(config.env, (v) => {
                return _.template(v)(ctx);
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
            const runfile = yield import(join(runtime.baseDir, config.exec));
            const outputs = (yield runfile[config.func](runtime, ...(config.args || [])));
            if (!outputs.contracts && !outputs.txns) {
                throw new Error('deployed contracts/txns not returned from script. Please supply any deployed contract in contracts property of returned json. If no contracts were deployed, return an empty object.');
            }
            outputs.contracts = _.mapValues(outputs.contracts, (c) => (Object.assign(Object.assign({}, c), { deployedOn: runtime.currentLabel })));
            outputs.txns = _.mapValues(outputs.txns, (t) => (Object.assign(Object.assign({}, t), { deployedOn: runtime.currentLabel })));
            return outputs;
        });
    },
};
