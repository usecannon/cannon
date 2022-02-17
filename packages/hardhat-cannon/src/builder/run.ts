import { JTDDataType } from 'ajv/dist/core';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { ChainBuilderContext } from './';
import { ChainDefinitionScriptSchema } from './util';

const config = {
    properties: {
        exec: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } },
        step: { type: 'int32' }
    }
} as const;

export type Config = JTDDataType<typeof config>;

export interface Outputs {
    [key: string]: string,
};

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
    validate: config,

    configInject(ctx: ChainBuilderContext, config: Config) {
        config = _.cloneDeep(config);

        config.exec = _.template(config.exec)(ctx);

        if (config.args) {
            config.args = _.map(config.args, (v => {
                return _.template(v)(ctx);
            }));
        }

        if (config.env) {
            config.env = _.map(config.env, (v => {
                return _.template(v)(ctx);
            }));
        }

        return config;
    },


    async exec(hre: HardhatRuntimeEnvironment, config: Config): Promise<Outputs> {
        return {};
    }
}