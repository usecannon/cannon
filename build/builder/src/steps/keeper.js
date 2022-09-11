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
import { ChainDefinitionScriptSchema } from '../util';
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
    validate: ChainDefinitionScriptSchema,
    getState(_runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.configInject(ctx, config);
        });
    },
    configInject(ctx, config) {
        config = _.cloneDeep(config);
        config.exec = _.template(config.exec)(ctx);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exec(_runtime, _ctx, _config) {
        return __awaiter(this, void 0, void 0, function* () {
            return {};
        });
    },
};
