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
import { ChainBuilder } from '../builder';
const debug = Debug('cannon:builder:import');
const config = {
    properties: {
        source: { type: 'string' },
    },
    optionalProperties: {
        chainId: { type: 'int32' },
        preset: { type: 'string' },
        options: {
            values: { type: 'string' },
        },
        depends: { elements: { type: 'string' } },
    },
};
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
        config.source = _.template(config.source)(ctx);
        config.preset = _.template(config.preset)(ctx) || 'main';
        if (config.options) {
            config.options = _.mapValues(config.options, (v) => {
                return _.template(v)(ctx);
            });
        }
        return config;
    },
    exec(runtime, ctx, config) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('exec', config);
            // download if necessary upstream
            // then provision a builder and build the cannonfile
            const [name, version] = config.source.split(':');
            const builder = new ChainBuilder({
                name,
                version,
                writeMode: 'none',
                readMode: runtime.readMode,
                provider: runtime.provider,
                preset: config.preset,
                chainId: config.chainId || runtime.chainId,
                savedPackagesDir: runtime.packagesDir,
                getSigner: runtime.getSigner,
                getDefaultSigner: runtime.getDefaultSigner,
            });
            const outputs = yield builder.build(config.options || {});
            return {
                contracts: outputs.contracts,
                txns: outputs.txns,
                imports: outputs.imports,
            };
        });
    },
};
