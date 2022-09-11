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
const lodash_1 = __importDefault(require("lodash"));
const util_1 = require("../util");
// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
exports.default = {
    validate: util_1.ChainDefinitionScriptSchema,
    getState(_runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.configInject(ctx, config);
        });
    },
    configInject(ctx, config) {
        config = lodash_1.default.cloneDeep(config);
        config.exec = lodash_1.default.template(config.exec)(ctx);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exec(_runtime, _ctx, _config) {
        return __awaiter(this, void 0, void 0, function* () {
            return {};
        });
    },
};
