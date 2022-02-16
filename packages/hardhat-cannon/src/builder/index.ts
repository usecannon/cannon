import Ajv from "ajv";
import _ from 'lodash';

import hre from 'hardhat';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import type { JSONSchemaType } from "ajv";
import { JTDDataType } from "ajv/dist/core";
import { HardhatNode } from "hardhat/src/internal/hardhat-network/provider/node";
import * as persistableNode from "../persistable-node";

const ajv = new Ajv();

type OptionTypes = 'number'|'string'|'boolean';
type OptionTypesTs = string|number|boolean;
export interface ChainDefinitionOld {
    setting?: {
        [key: string]: {
            type?: OptionTypes,
            defaultValue?: OptionTypesTs
        }
    },
    import?: {
        [key: string]: {
            source: string,
            options?: {
                [key: string]: OptionTypesTs
            }
        }
    },
    contract?: {
        [key: string]: {
            artifact: string,
            args?: OptionTypesTs[]
            detect?: {
                folder: string
            }|{
                script: string
            }
        }
    },
    run?: {
        [key: string]: {
            script: string,
            args?: string[],
            env?: {
                [key: string]: string
            }
        }
    },
    keeper?: {
        [key: string]: {
            script: string,
            args?: string[],
            env?: {
                [key: string]: string
            }
        }
    }
}

const ChainDefinitionScriptSchema = {
    properties: {
        exec: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } }
    }
};

const ChainDefinitionSchema = {
    optionalProperties: {
        setting: {
            values: {
                optionalProperties: {
                    type: { enum: ['number', 'string', 'boolean'] },
                    defaultValue: {}
                }

            }
        },
        import: {
            values: {
                properties: {
                    source: { type: 'string' },
                },
                optionalProperties: {
                    options: {
                        values: {}
                    }
                }
            }
        },
        contract: {
            values: {
                properties: {
                    artifact: { type: 'string' },
                },
                optionalProperties: {
                    args: { elements: {} },
                    detect: {
                        discriminator: 'method',
                        mapping: {
                            'folder': { properties: { path: { type: 'string' }}},
                            'script': ChainDefinitionScriptSchema
                        }
                    },
                    order: { type: 'int32' }
                }

            }
        },
        run: {
            values: _.merge({
                optionalProperties: { order: { type: 'int32' }}
            }, ChainDefinitionScriptSchema)
        },
        keeper: {
            values: ChainDefinitionScriptSchema
        },
    }
} as const


export type ChainDefinition = JTDDataType<typeof ChainDefinitionSchema>

export const validateChainDefinition = ajv.compile(ChainDefinitionSchema);

export interface ChainBuilderContext {
    fork: boolean,
    settings: ChainBuilderOptions,

    outputs: {
        self: ChainBuilderOptions
        [module: string]: ChainBuilderOptions
    }
}

interface ChainBuilderOptions { [key: string]: OptionTypesTs };

const INITIAL_CHAIN_BUILDER_CONTEXT: ChainBuilderContext = {
    fork: false,

    settings: {},
    outputs: { self: {} }
};

export class ChainBuilder {

    readonly label: string;
    readonly def: ChainDefinition;

    constructor(label: string, def: ChainDefinition) {
        this.label = label;
        this.def = def;
    }


    async build(opts: { [val: string]: string }): Promise<void> {
        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;

        // TODO: this downcast shouldn't work in JS, ideas how to work around?
        // almost might be better to not extend the class like this.
        //const node = createdNode[1] as PersistableHardhatNode;

        // 1. read all settings
        this.populateSettings();

        // 2. read all imports
        for (const imp in (this.def.import || {})) {
            // TODO
        }

        await this.putCache( JSON.stringify(ctx));


        // 3. complete rest of steps in order given: contracts, runs, keeper config

        for (let i = 0;i < 0;i++) {
            await this.putCache()

        }

        // create/export cached snapshot after step 2, and again for every operation in step 3

        // return value hands reigns of running network to whatever called this

        return this;
    }

    async exec(opts: { [val: string]: string }) {

        // construct full context
        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;
        this.populateSettings(ctx);



        // load the cache (note: will fail if `build()` has not been called first)
        this.loadCache(this.cacheKey(ctx));

        await hre.run('node');
    }

    populateSettings(ctx: ChainBuilderContext) {
        for (const s in (this.def.setting || {})) {

            let value = this.def.setting![s].defaultValue;

            // check if the value has been supplied
            if (opts[s]) {
                value = opts[s];
            }

            if (!value) {
                throw new Error(`undefined setting: ${value}`);
            }

            ctx.settings[s] = value as OptionTypesTs;
        }
    }

    cacheFile(key: string) {
        return path.join(hre.config.paths.cache, 'cannon', this.label, key);
    }

    cacheKey(ctx: ChainBuilderContext) {
        // the purpose of this string is to indicate the state of the chain without accounting for
        // derivative factors (ex. contract addreseses, outputs)
        const str = [
            ctx.fork,
            _.map(ctx.settings, (k, v) => `${k},${v}`).join(';'),
            Object.keys(ctx.outputs).join(',')
        ].join(';');

        return crypto.createHash('md5').update(str).digest('hex');
    }

    clearCache() {
        fs.rmdirSync(path.join(hre.config.paths.cache, 'cannon', this.label));
    }

    async loadCache(key: string) {
        const cacheFile = this.cacheFile(key);

        const cacheData = fs.readFileSync(cacheFile);

        await persistableNode.loadState(cacheData);
    }

    async putCache(key: string) {
        const cacheFile = this.cacheFile(key);

        const data = await persistableNode.dumpState();

        fs.writeFileSync(cacheFile, data);
    }
}