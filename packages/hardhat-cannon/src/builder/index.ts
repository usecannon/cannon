import Ajv from "ajv/dist/jtd";
import _ from 'lodash';

import fs from 'fs-extra';
import path, { dirname } from 'path';
import crypto from 'crypto';

import { JTDDataType } from "ajv/dist/core";
import * as persistableNode from "../persistable-node";

import contractSpec from './contract';
import invokeSpec from './invoke';
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
        invoke: { values: invokeSpec.validate },
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
    network: string,
    chainId: number,

    outputs: {
        self: ChainBuilderOptions
        [module: string]: ChainBuilderOptions
    }
}

interface ChainBuilderOptions { [key: string]: OptionTypesTs };

const INITIAL_CHAIN_BUILDER_CONTEXT: ChainBuilderContext = {
    fork: false,
    network: '',
    chainId: 31337,

    settings: {},
    outputs: { self: {} }
};

export class ChainBuilder {

    readonly label: string;
    readonly def: ChainDefinition;
    readonly hre: HardhatRuntimeEnvironment;

    private ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;

    constructor(label: string, hre: HardhatRuntimeEnvironment, def?: ChainDefinition) {
        this.label = label;
        this.hre = hre;
        this.def = def ?? this.loadCannonfile();
    }


    async build(opts: BuildOptions): Promise<ChainBuilder> {
        debug('build');

        await this.writeCannonfile();

        const latestLayer = await this.getTopLayer();

        this.ctx = latestLayer[1];

        // TODO: this downcast shouldn't work in JS, ideas how to work around?
        // almost might be better to not extend the class like this.
        //const node = createdNode[1] as PersistableHardhatNode;

        // 1. read all settings
        debug('populate settings');
        this.populateSettings(this.ctx, opts);



        // 3. do layers
        const steppedImports = _.groupBy(_.toPairs(this.def.import), c => c[1].step || 0);
        const steppedContracts = _.groupBy(_.toPairs(this.def.contract), c => c[1].step || 0);
        const steppedInvokes = _.groupBy(_.toPairs(this.def.invoke), c => c[1].step || 0);
        const steppedRuns = _.groupBy(_.toPairs(this.def.run), c => c[1].step || 0);

        const steps = _.map(_.union(_.keys(steppedImports), _.keys(steppedContracts), _.keys(steppedInvokes), _.keys(steppedRuns)), parseFloat);
        
        let doLoad: number|null = null;

        for (const s of steps.sort()) {
            debug('step', s);

            if (await this.hasLayer(s)) {
                doLoad = s;
            }
            else {
                if (doLoad !== null) {
                    debug(`load step ${s} from cache`);
                    await this.loadLayer(doLoad);

                    // repopulate settings since they may differ on this run.
                    // outputs we want to keep though
                    this.populateSettings(this.ctx, opts);
                    doLoad = null;
                }

                debug(`imports step ${s}`);
                for (const [name, doImport] of (steppedImports[s] || [])) {
                    const output = await importSpec.exec(this.hre, importSpec.configInject(this.ctx, doImport));

                    output[name] = output.self;
                    delete output.self;

                    this.ctx.outputs = { ...this.ctx.outputs,  ...output } as any;
                }

                debug(`contracts step ${s}`);
                // todo: parallelization can be utilized here
                for (const [name, doContract] of (steppedContracts[s] || [])) {
                    const output = await contractSpec.exec(this.hre, contractSpec.configInject(this.ctx, doContract));
                    _.set(this.ctx.outputs.self, `contracts.${name}`, output);
                }

                debug(`invoke step ${s}`);
                // todo: parallelization can be utilized here
                for (const [name, doInvoke] of (steppedInvokes[s] || [])) {
                    const output = await invokeSpec.exec(this.hre, invokeSpec.configInject(this.ctx, doInvoke));
                    _.set(this.ctx.outputs.self, `invokes.${name}`, output);
                }

                debug(`scripts step ${s}`);
                for (const [name, doScript] of (steppedRuns[s] || [])) {
                    const output = await scriptSpec.exec(this.hre, scriptSpec.configInject(this.ctx, doScript));
                    _.set(this.ctx.outputs.self, `contracts.${name}`, output);
                }
    
                await this.dumpLayer(s);
            }
        }

        //// TEMP
        if (doLoad !== null) {
            await this.loadLayer(doLoad);
        }
        return this;
    }

    async exec(opts: { [val: string]: string }) {

        // construct full context
        const ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;
        this.populateSettings(ctx, opts);

        // load the cache (note: will fail if `build()` has not been called first)
        const topLayer = await this.getTopLayer();

        this.ctx = topLayer[1];
        
        if (await this.hasLayer(topLayer[0])) {
            await this.loadLayer(topLayer[0]);

            // run keepers
            for (const n in (this.def.keeper || [])) {
                debug('running keeper', n);
                keeperSpec.exec(this.hre, keeperSpec.configInject(this.ctx, this.def.keeper![n]));
            }

            // run node
            await this.hre.run('node');
        }
        else {
            throw new Error('top layer is not built. Call `build` in order to execute this chain.');
        }

    }

    getOutputs() {
        const outputs: { [name: string]: any } = _.cloneDeep(this.ctx.outputs);
        //outputs[this.label] = outputs.self;
        //delete outputs.self;

        return outputs;
    }

    populateSettings(ctx: ChainBuilderContext, opts: BuildOptions) {
        for (const s in (this.def.setting || {})) {

            let value = this.def.setting![s].defaultValue;

            // check if the value has been supplied
            if (opts[s]) {
                value = opts[s];
            }

            if (!value) {
                throw new Error(`setting not provided: ${s}`);
            }

            ctx.settings[s] = value as OptionTypesTs;
        }
    }

    async getTopLayer(): Promise<[number, ChainBuilderContext]> {
        // try to load highest file in dir
        const dirToScan = dirname(this.getLayerFiles(0).metadata)
        let fileList: string[] = [];
        try {
            fileList = await fs.readdir(dirToScan);
        } catch {} 

        const sortedFileList = _.sortBy(fileList
            .filter(n => n.match(/[0-9]*-.*.json/))
            .map(n => {
                const num = parseFloat(n.match(/^([0-9]*)-/)![1]);
                return { n: num, name: n }
            }), 'n');

        if (sortedFileList.length) {
            const item = _.last(sortedFileList)!;
            return [item.n, JSON.parse((await fs.readFile(path.join(dirToScan, item.name))).toString())]
        }
        else {
            const newCtx = INITIAL_CHAIN_BUILDER_CONTEXT;
            newCtx.network = this.hre.network.name;
            newCtx.chainId = this.hre.network.config.chainId || 31337;

            return [0, newCtx];
        }
    }

    async hasLayer(n: number) {
        try {
            await fs.stat(this.getLayerFiles(n).chain)

            return true;
        } catch {}

        return false;
    }

    getCacheDir() {
        return path.join(this.hre.config.paths.cache, 'cannon', this.label);
    }

    getLayerFiles(n: number) {
        const filename = n + '-' + this.layerHash(n);

        const basename = path.join(this.getCacheDir(), filename)

        return {
            cannonfile: path.join(this.hre.config.paths.cache, 'cannon', this.label, 'cannonfile.json'),
            chain: basename + '.chain',
            metadata: basename + '.json'
        };
    }

    layerHash(step: number = Number.MAX_VALUE) {
        // the purpose of this string is to indicate the state of the chain without accounting for
        // derivative factors (ex. contract addreseses, outputs)
        const str = JSON.stringify([
            // todo: record values here need to be sorted, perhaps put into pairs
            this.def.setting,
            _.mapValues(this.def.import, d => importSpec.configInject(this.ctx, d)),
            _.map(_.filter(this.def.contract, c => (c.step || 0) <= step), d => contractSpec.configInject(this.ctx, d)),
            _.map(_.filter(this.def.run, c => (c.step || 0) <= step), d => scriptSpec.configInject(this.ctx, d))
        ]);

        return crypto.createHash('md5').update(str).digest('hex');
    }

    clearCache() {
        fs.rmdirSync(path.join(this.hre.config.paths.cache, 'cannon', this.label));
    }

    async verifyLayerContext(n: number) {
        try {
            const stat = await fs.stat(this.getLayerFiles(n).metadata);
            return stat.isFile();
        } catch(err) {}

        return false;
    }

    async loadLayer(n: number) {
        debug('load cache', n);

        const { chain, metadata } = this.getLayerFiles(n);

        const cacheData = await fs.readFile(chain);

        this.ctx = JSON.parse((await fs.readFile(metadata)).toString('utf8')) as ChainBuilderContext;

        await persistableNode.loadState(this.hre, cacheData);

        
    }

    async dumpLayer(n: number) {

        const { chain, metadata } = this.getLayerFiles(n);

        const data = await persistableNode.dumpState(this.hre);

        debug('put cache', n);

        await fs.ensureDir(dirname(chain));
        await fs.writeFile(chain, data);
        await fs.ensureDir(dirname(metadata));
        await fs.writeFile(metadata, JSON.stringify(this.ctx));
    }

    async writeCannonfile() {
        const { cannonfile } = this.getLayerFiles(0);
        await fs.ensureDir(dirname(cannonfile));
        await fs.writeFile(cannonfile, JSON.stringify(this.def));
    }

    loadCannonfile() {
        const file = path.join(this.getCacheDir(), 'cannonfile.json');
        return JSON.parse(fs.readFileSync(file).toString('utf8'));
    }
}