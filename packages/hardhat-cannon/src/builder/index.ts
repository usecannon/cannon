import Ajv from "ajv/dist/jtd";
import _ from 'lodash';

import fs from 'fs-extra';
import path, { dirname } from 'path';
import crypto from 'crypto';

import { JTDDataType } from "ajv/dist/core";
import * as persistableNode from "../persistable-node";

import contractSpec from './contract';
import importSpec from './import';
import scriptSpec from './run';
import keeperSpec from './keeper';
import { HardhatRuntimeEnvironment } from "hardhat/types";

import Debug from 'debug';
const debug = Debug('cannon:builder');

const ajv = new Ajv();

type OptionTypes = 'number'|'string'|'boolean';
type OptionTypesTs = string|number|boolean;

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
        import: { values: importSpec.validate },
        contract: { values: contractSpec.validate },
        run: { values: scriptSpec.validate },
        keeper: { values: keeperSpec.validate },
    }
} as const


export type ChainDefinition = JTDDataType<typeof ChainDefinitionSchema>

export type BuildOptions = { [val: string]: string };

export const validateChainDefinition = ajv.compileParser(ChainDefinitionSchema);

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
    readonly hre: HardhatRuntimeEnvironment;

    constructor(label: string, def: ChainDefinition, hre: HardhatRuntimeEnvironment) {
        this.label = label;
        this.def = def;

        this.hre = hre/* || require('hardhat');*/
    }


    async build(opts: BuildOptions): Promise<ChainBuilder> {
        debug('build');

        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;

        // TODO: this downcast shouldn't work in JS, ideas how to work around?
        // almost might be better to not extend the class like this.
        //const node = createdNode[1] as PersistableHardhatNode;

        // 1. read all settings
        debug('populate settings');
        this.populateSettings(ctx, opts);

        // 2. read all imports
        const key = this.cacheKey(ctx, 0);

        if (this.def.import && await this.hasCache(key)) {
            debug('load imports from cache', key);
            await this.loadCache(key);
        }
        else if (this.def.import) {
            // todo: parallelization can be utilized here
            for (const imp in (this.def.import)) {
                await importSpec.exec(this.hre, importSpec.configInject(ctx, this.def.import[imp]));
            }

            await this.putCache(key);
        }



        // 3. complete `contract` and then `run` steps, adjusting for priority given
        const steppedContracts = _.groupBy(this.def.contract, 'step');
        const steppedRuns = _.groupBy(this.def.run, 'step');

        const steps = _.union(_.keys(steppedContracts), _.keys(steppedContracts));

        for (const s of steps.sort()) {
            debug('step', s);
            const key = this.cacheKey(ctx, parseInt(s));

            if (await this.hasCache(key)) {
                debug(`load step ${s} from cache`, key);
                await this.loadCache(key);
            }
            else {
                debug(`deploy contracts step ${s}`);
                // todo: parallelization can be utilized here
                for (const doContract of (steppedContracts[s] || [])) {
                    await contractSpec.exec(this.hre, contractSpec.configInject(ctx, doContract));
                }

                debug(`deploy scripts step ${s}`);
                for (const doScript of (steppedRuns[s] || [])) {
                    await scriptSpec.exec(this.hre, scriptSpec.configInject(ctx, doScript));
                }
    
                await this.putCache(key);
            }
        }

        console.log('THE CODE', await this.hre.ethers.provider.getCode('0x5fbdb2315678afecb367f032d93f642f64180aa3'));

        //// TEMP
        const greeter = await this.hre.ethers.getContractAt('Greeter', '0x5fbdb2315678afecb367f032d93f642f64180aa3');

        console.log(await greeter.greet());

        // create/export cached snapshot after step 2, and again for every operation in step 3

        // return value hands reigns of running network to whatever called this

        return this;
    }

    async exec(opts: { [val: string]: string }) {

        // construct full context
        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;
        this.populateSettings(ctx, opts);

        // load the cache (note: will fail if `build()` has not been called first)
        await this.loadCache(this.cacheKey(ctx));
        await this.hre.run('node');
    }

    populateSettings(ctx: ChainBuilderContext, opts: BuildOptions) {
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
        return path.join(this.hre.config.paths.cache, 'cannon', this.label, key);
    }

    cacheKey(ctx: ChainBuilderContext, step: number = Number.MAX_VALUE) {

        // the purpose of this string is to indicate the state of the chain without accounting for
        // derivative factors (ex. contract addreseses, outputs)
        const str = JSON.stringify([
            // todo: record values here need to be sorted, perhaps put into pairs
            this.def.setting,
            _.mapValues(this.def.import, d => importSpec.configInject(ctx, d)),
            _.map(_.filter(this.def.contract, c => (c.step || 0) < step), d => contractSpec.configInject(ctx, d)),
            _.map(_.filter(this.def.run, c => (c.step || 0) < step), d => scriptSpec.configInject(ctx, d))
        ]);

        return crypto.createHash('md5').update(str).digest('hex');
    }

    clearCache() {
        fs.rmdirSync(path.join(this.hre.config.paths.cache, 'cannon', this.label));
    }

    async hasCache(key: string) {
        try {
            const stat = await fs.stat(this.cacheFile(key));
            return stat.isFile();
        } catch(err) {}

        return false;
    }

    async loadCache(key: string) {
        debug('load cache', key);

        const cacheFile = this.cacheFile(key);

        const cacheData = await fs.readFile(cacheFile);

        await persistableNode.loadState(this.hre, cacheData);
    }

    async putCache(key: string) {

        const cacheFile = this.cacheFile(key);

        const data = await persistableNode.dumpState(this.hre);

        debug('put cache', key, cacheFile);

        await fs.ensureDir(dirname(cacheFile));
        await fs.writeFile(cacheFile, data);
    }
}