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
exports.ChainBuilder = exports.Events = exports.StepKinds = exports.validateChainDefinition = void 0;
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const lodash_1 = __importDefault(require('lodash'));
const debug_1 = __importDefault(require('debug'));
const crypto_1 = __importDefault(require('crypto'));
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importStar(require('path'));
const events_1 = require('events');
const util_1 = require('./util');
const storage_1 = require('./storage');
var types_1 = require('./types');
Object.defineProperty(exports, 'validateChainDefinition', {
    enumerable: true,
    get: function () {
        return types_1.validateChainDefinition;
    },
});
const debug = (0, debug_1.default)('cannon:builder');
const BUILD_VERSION = 3;
const contract_1 = __importDefault(require('./steps/contract'));
const import_1 = __importDefault(require('./steps/import'));
const invoke_1 = __importDefault(require('./steps/invoke'));
const run_1 = __importDefault(require('./steps/run'));
const _1 = require('.');
exports.StepKinds = {
    contract: contract_1.default,
    import: import_1.default,
    invoke: invoke_1.default,
    run: run_1.default,
};
var Events;
(function (Events) {
    Events['PreStepExecute'] = 'pre-step-execute';
    Events['PostStepExecute'] = 'post-step-execute';
    Events['DeployContract'] = 'deploy-contract';
    Events['DeployTxn'] = 'deploy-txn';
})((Events = exports.Events || (exports.Events = {})));
const DEFAULT_PRESET = 'main';
class ChainBuilder extends events_1.EventEmitter {
    constructor({ name, version, def, preset, readMode, writeMode, getSigner, getDefaultSigner, getArtifact, chainId, provider, baseDir, savedChartsDir, }) {
        super();
        this.cleanSnapshot = null;
        this.currentLabel = null;
        this.name = name;
        this.version = version;
        this.chartsDir = savedChartsDir || (0, storage_1.getSavedChartsDir)();
        this.chartDir = (0, storage_1.getChartDir)(this.chartsDir, name, version);
        this.def = def !== null && def !== void 0 ? def : this.loadCannonfile();
        this.allActionNames = this.getAllActions();
        this.preset = preset !== null && preset !== void 0 ? preset : DEFAULT_PRESET;
        this.chainId = chainId;
        this.provider = provider;
        this.baseDir = baseDir || null;
        this.getSigner = getSigner;
        this.getDefaultSigner = getDefaultSigner || ((txn, salt) => (0, util_1.getExecutionSigner)(provider, txn, salt));
        this.getArtifact = getArtifact
            ? lodash_1.default.partial(util_1.passThroughArtifact, this.chartDir, getArtifact)
            : (name) => (0, util_1.getStoredArtifact)(this.chartDir, name);
        //@ts-ignore
        if (!this.def.name) {
            throw new Error('Missing "name" property on cannonfile.toml');
        }
        //@ts-ignore
        if (!this.def.version) {
            throw new Error('Missing "version" property on cannonfile.toml');
        }
        this.readMode = readMode || 'none';
        this.writeMode = writeMode || 'none';
    }
    getDependencies(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.def.import)
                return [];
            // we have to apply templating here, only to the `source`
            // it would be best if the dep was downloaded when it was discovered to be needed, but there is not a lot we
            // can do about this right now
            const ctx = yield this.populateSettings(opts);
            return lodash_1.default.uniq(Object.values(this.def.import).map((d) => ({
                source: lodash_1.default.template(d.source)(ctx),
                chainId: d.chainId || this.chainId,
                preset: lodash_1.default.template(d.preset || 'main')(ctx),
            })));
        });
    }
    runStep(n, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentLabel = n;
            const cfg = lodash_1.default.get(this.def, n);
            if (!cfg) {
                throw new Error(`action ${n} missing for execution`);
            }
            const [type, label] = n.split('.');
            this.emit(Events.PreStepExecute, type, label);
            const injectedConfig = exports.StepKinds[type].configInject(ctx, cfg);
            const output = yield exports.StepKinds[type].exec(this, ctx, injectedConfig);
            if (type === 'import') {
                ctx.imports[label] = output;
            }
            else {
                for (const contract in output.contracts) {
                    if (ctx.contracts[contract]) {
                        // name reused
                        throw new Error(`duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${ctx.contracts[contract].address} in step ${'tbd'}`);
                    }
                    ctx.contracts[contract] = output.contracts[contract];
                    this.emit(Events.DeployContract, n, output.contracts[contract]);
                }
                for (const txn in output.txns) {
                    if (ctx.txns[txn]) {
                        // name reused
                        throw new Error(`duplicate transaction label ${txn}. Please double check your cannonfile/scripts to ensure a txn name is used only once.
            
previous txn deployed at: ${ctx.txns[txn].hash} in step ${'tbd'}`);
                    }
                    ctx.txns[txn] = output.txns[txn];
                    this.emit(Events.DeployTxn, n, output.txns[txn]);
                }
            }
            this.emit(Events.PostStepExecute, type, label, output);
            this.currentLabel = null;
        });
    }
    findNextSteps(alreadyDone) {
        const doneActionNames = Array.from(alreadyDone.keys());
        return lodash_1.default.filter(this.allActionNames.map((n) => [n, lodash_1.default.get(this.def, n)]), ([n, conf]) => !alreadyDone.has(n) && // step itself is not already done
            lodash_1.default.difference(conf.depends || [], doneActionNames).length === 0 // all dependencies are already done
        );
    }
    runSteps(opts, alreadyDone) {
        return __awaiter(this, void 0, void 0, function* () {
            // needed in case layers
            const nextSteps = this.findNextSteps(alreadyDone);
            const newlyDone = [];
            for (const [n, conf] of nextSteps) {
                let ctx = yield this.populateSettings(opts);
                for (const dep of conf.depends || []) {
                    ctx = yield this.augmentCtx([ctx, alreadyDone.get(dep)], opts);
                }
                debug(`run step ${n}`, conf);
                yield this.runStep(n, ctx);
                // dump layer in case we are writing metadata
                yield this.dumpLayer(ctx, n);
                newlyDone.push([n, ctx]);
            }
            return newlyDone;
        });
    }
    // runs any steps that can be immediately completed without iterating into deeper layers
    // returns the list of new steps completed.
    runRecordedSteps(opts, alreadyDone, layers) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: handle what happens on write mode all but read mode none
            const nextSteps = this.findNextSteps(alreadyDone);
            const newlyDone = [];
            // needed in case layers
            const skipActions = new Map();
            for (const [n, conf] of nextSteps) {
                if (skipActions.has(n)) {
                    newlyDone.push([n, skipActions.get(n)]);
                    continue;
                }
                yield this.clearNode();
                let ctx = yield this.populateSettings(opts);
                // load full state for all dependencies
                if (layers && layers.has(n)) {
                    const layerInfo = layers.get(n);
                    for (const dep of layerInfo.depends) {
                        const newCtx = yield this.loadLayer(dep);
                        if (!newCtx) {
                            throw new Error(`could not load metadata from action ${dep}`);
                        }
                        ctx = yield this.augmentCtx([ctx, newCtx], opts);
                    }
                    debug('enter layer', layerInfo.actions);
                    debug('layer deps', layerInfo.depends);
                    for (const otherN of layerInfo.actions) {
                        debug(`run step in layer ${n}`, conf);
                        // run all layer actions regarless of of they have been done already or not
                        // a new layer will be recorded with all of these together
                        yield this.runStep(otherN, ctx);
                    }
                    for (const otherN of layerInfo.actions) {
                        // save the fresh layer for all linked layers
                        // todo: this could be a lot more efficient if `dumpLayer` took an array
                        yield this.dumpLayer(ctx, otherN);
                        skipActions.set(otherN, ctx);
                    }
                }
                else {
                    for (const dep of conf.depends) {
                        const newCtx = yield this.loadLayer(dep);
                        if (!newCtx) {
                            throw new Error(`could not load metadata from action ${dep}`);
                        }
                        ctx = yield this.augmentCtx([ctx, newCtx], opts);
                    }
                    debug(`run step ${n}`, conf);
                    yield this.runStep(n, ctx);
                    yield this.dumpLayer(ctx, n);
                }
                newlyDone.push([n, ctx]);
            }
            return newlyDone;
        });
    }
    getAllActions() {
        const actions = [];
        for (const kind in exports.StepKinds) {
            for (const n in this.def[kind]) {
                actions.push(`${kind}.${n}`);
            }
        }
        return lodash_1.default.sortBy(actions, lodash_1.default.identity);
    }
    analyzeActions(opts, actions = this.allActionNames, analysis = {
        matched: new Map(),
        unmatched: new Set(),
        heads: new Set(),
        layers: new Map(),
    }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!analysis.heads.size) {
                for (const n of actions) {
                    analysis.heads.add(n);
                }
                // layers is done as a separate calculation
                const layers = this.getStateLayers(actions);
                // rekey for analysis
                for (const layer of Object.values(layers)) {
                    for (const n of layer.actions) {
                        analysis.layers.set(n, layer);
                    }
                }
            }
            for (const n of actions) {
                if (analysis.matched.has(n) || analysis.unmatched.has(n)) {
                    continue;
                }
                const action = lodash_1.default.get(this.def, n);
                if (!action) {
                    throw new Error(`action not found: ${n}`);
                }
                // if any of the depended upon actions are unmatched, this is unmatched
                let ctx = yield this.populateSettings(opts);
                for (const dep of action.depends || []) {
                    if (lodash_1.default.sortedIndexOf(this.allActionNames, dep) === -1) {
                        throw new Error(`in dependencies for ${n}: '${dep}' is not a known action.

please double check your configuration. the list of known actions is:
${this.allActionNames.join('\n')}
          `);
                    }
                    analysis.heads.delete(dep);
                    yield this.analyzeActions(opts, [dep], analysis);
                    if (analysis.unmatched.has(dep)) {
                        analysis.unmatched.add(n);
                        continue;
                    }
                    else {
                        ctx = yield this.augmentCtx([ctx, analysis.matched.get(dep)], opts);
                    }
                }
                // if layerMatches returns true, its matching
                const curCtx = yield this.layerMatches(ctx, n);
                if (curCtx) {
                    analysis.matched.set(n, curCtx);
                }
                else {
                    analysis.unmatched.add(n);
                }
            }
            return analysis;
        });
    }
    // on local nodes, steps depending on the same base need to be merged into "layers" to prevent state collisions
    // returns an array of layers which can be deployed as a unit in topological order
    getStateLayers(actions = this.allActionNames, layers = {}, layerOfActions = new Map(), layerDependingOn = new Map()) {
        for (const n of actions) {
            if (layerOfActions.has(n)) {
                continue;
            }
            const action = lodash_1.default.get(this.def, n);
            if (!action) {
                throw new Error(`action not found: ${n}`);
            }
            // find a layer to attach to
            let attachingLayer = null;
            for (const dep of action.depends || []) {
                if (!layerOfActions.has(dep)) {
                    this.getStateLayers([dep], layers, layerOfActions);
                }
                const depLayer = layerOfActions.get(dep);
                const dependingLayer = layerDependingOn.get(depLayer);
                if (dependingLayer) {
                    if (attachingLayer) {
                        // "merge" this entire layer into the other one
                        layers[dependingLayer].actions.push(...layers[attachingLayer].actions);
                        layers[dependingLayer].actions.push(...layers[attachingLayer].depends);
                    }
                    else {
                        // "join" this layer
                        layers[dependingLayer].actions.push(n);
                    }
                    attachingLayer = dependingLayer;
                }
                else if (attachingLayer && layers[attachingLayer].depends.indexOf(depLayer) === -1) {
                    // "extend" this layer to encapsulate this
                    layers[attachingLayer].depends.push(depLayer);
                    layerDependingOn.set(depLayer, attachingLayer);
                }
            }
            // if never attached to layer make a new one
            if (!attachingLayer) {
                attachingLayer = n;
                layers[n] = { actions: [n], depends: (action.depends || []).map((dep) => layerOfActions.get(dep)) };
            }
            for (const n of layers[attachingLayer].actions) {
                layerOfActions.set(n, attachingLayer);
            }
            for (const d of layers[attachingLayer].depends) {
                layerDependingOn.set(d, attachingLayer);
            }
        }
        return layers;
    }
    build(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('build');
            debug(`read mode: ${this.readMode}, write mode: ${this.writeMode}`);
            if (this.readMode !== 'none') {
                // ensure the current deployment is supported if we try to load the files
                yield this.getDeploymentInfo();
            }
            // ensure the latest cannonfile is persisted
            yield this.writeCannonfile();
            const networkInfo = yield this.provider.getNetwork();
            if (networkInfo.chainId !== this.chainId) {
                throw new Error(`provider reported chainId (${networkInfo.chainId}) does not match configured builder chain id (${this.chainId})`);
            }
            const analysis = yield this.analyzeActions(opts);
            const loadedStates = new Set();
            while (analysis.matched.size < this.allActionNames.length) {
                let lastDone;
                if (this.writeMode === 'all') {
                    lastDone = yield this.runRecordedSteps(opts, analysis.matched, this.writeMode === 'all' ? analysis.layers : null);
                }
                else {
                    const nextSteps = this.findNextSteps(analysis.matched);
                    // load layers for next step
                    debug('load from fresh', nextSteps);
                    for (const [, conf] of nextSteps) {
                        for (const dep of conf.depends || []) {
                            if (!loadedStates.has(dep)) {
                                yield this.loadLayer(dep);
                                loadedStates.add(dep);
                            }
                        }
                    }
                    lastDone = yield this.runSteps(opts, analysis.matched);
                    for (const [n] of lastDone) {
                        loadedStates.add(n);
                    }
                }
                if (!lastDone.length) {
                    throw new Error(`cannonfile is invalid: the following actions form a dependency cycle and therefore cannot be loaded:
${lodash_1.default.difference(this.getAllActions(), Array.from(analysis.matched.keys())).join('\n')}`);
                }
                for (const newLastDone of lastDone) {
                    analysis.matched.set(newLastDone[0], newLastDone[1]);
                }
            }
            if (this.writeMode === 'all') {
                // have to reload state of final chain
                yield this.clearNode();
                for (const n of analysis.heads) {
                    yield this.loadLayer(n);
                }
            }
            else {
                debug('loading from heads');
                for (const head of analysis.heads) {
                    if (!loadedStates.has(head)) {
                        yield this.loadLayer(head);
                    }
                }
            }
            if (this.writeMode !== 'none') {
                yield (0, _1.putDeploymentInfo)(this.chartDir, this.chainId, this.preset, {
                    options: opts,
                    buildVersion: BUILD_VERSION,
                    ipfsHash: '',
                    heads: Array.from(analysis.heads),
                });
            }
            // assemble the final context for the user
            return this.augmentCtx(Array.from(analysis.heads).map((n) => analysis.matched.get(n)), opts);
        });
    }
    // clean any artifacts associated with the current
    wipe() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, _1.clearDeploymentInfo)(this.chartDir, this.chainId, this.preset);
        });
    }
    getDeploymentInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const deployInfo = yield (0, _1.getDeploymentInfo)(this.chartDir, this.chainId, this.preset);
            if (deployInfo) {
                if (deployInfo.buildVersion < BUILD_VERSION) {
                    throw new Error(`the package you have loaded is not compatible with this version of cannon.
          package build version:\t${deployInfo.buildVersion}
          supported build version:\t>=${BUILD_VERSION}`);
                }
            }
            return deployInfo;
        });
    }
    getOutputs() {
        return __awaiter(this, void 0, void 0, function* () {
            // load all the top layers and merge their states
            const deployInfo = yield this.getDeploymentInfo();
            if (!deployInfo) {
                return null;
            }
            let ctx = yield this.populateSettings({});
            for (const h of deployInfo.heads) {
                debug('load head for output', h);
                const newCtx = yield this.loadLayer(lodash_1.default.last(h.split('/')));
                if (!newCtx) {
                    throw new Error('context not declared for published layer');
                }
                ctx = yield this.augmentCtx([ctx, newCtx], {});
            }
            return ctx;
        });
    }
    populateSettings(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let pkg = null;
            if (this.baseDir) {
                try {
                    pkg = require(path_1.default.join(this.baseDir, 'package.json'));
                }
                catch (_a) {
                    console.warn('package.json file not found. Cannot add to chain builder context.');
                }
            }
            return this.augmentCtx([
                {
                    settings: {},
                    chainId: 0,
                    timestamp: '0',
                    package: pkg,
                    contracts: {},
                    txns: {},
                    imports: {},
                },
            ], opts);
        });
    }
    augmentCtx(ctxs, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const resolvedOpts = lodash_1.default.clone(opts);
            const ctx = lodash_1.default.clone(ctxs[0]);
            for (const s in this.def.setting || {}) {
                if (!((_a = this.def.setting) === null || _a === void 0 ? void 0 : _a[s])) {
                    throw new Error(`Missing setting "${s}"`);
                }
                const def = this.def.setting[s];
                let value;
                // check if the value has been supplied
                if (opts[s]) {
                    value = opts[s];
                }
                else if (def.defaultValue !== undefined) {
                    value = def.defaultValue;
                }
                else {
                    throw new Error(`setting not provided: ${s}`);
                }
                resolvedOpts[s] = value;
            }
            ctx.settings = resolvedOpts;
            ctx.chainId = this.chainId;
            ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();
            // merge all blockchain outputs
            for (const additionalCtx of ctxs.slice(1)) {
                ctx.contracts = Object.assign(Object.assign({}, ctx.contracts), additionalCtx.contracts);
                ctx.txns = Object.assign(Object.assign({}, ctx.txns), additionalCtx.txns);
                ctx.imports = Object.assign(Object.assign({}, ctx.imports), additionalCtx.imports);
            }
            return ctx;
        });
    }
    layerMatches(ctx, stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode === 'none') {
                return null;
            }
            try {
                const contents = yield fs_extra_1.default.readJson((0, storage_1.getActionFiles)(this.chartDir, ctx.chainId, this.preset, stepName).metadata);
                const newHash = yield this.actionHash(ctx, stepName);
                debug('comparing hashes for action', contents.hash, newHash);
                if (!newHash || contents.hash === newHash) {
                    return contents.ctx;
                }
                return null;
            }
            catch (err) {
                debug(`layer ${stepName} not loaded: ${err}`);
                return null;
            }
        });
    }
    actionHash(ctx, stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            // the purpose of this is to indicate the state of the chain without accounting for
            // derivative factors (ex. contract addreseses, outputs)
            const [type, name] = stepName.split('.');
            const typeConfig = this.def[type];
            if (!typeConfig || !typeConfig[name]) {
                throw new Error(`missing step: ${type}.${name}`);
            }
            const obj = yield exports.StepKinds[type].getState(this, ctx, typeConfig[name]);
            if (!obj) {
                return null;
            }
            else {
                return crypto_1.default.createHash('md5').update(JSON.stringify(obj)).digest('hex');
            }
        });
    }
    loadLayer(stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode === 'none') {
                return null;
            }
            debug('load cache', stepName);
            const { chain, metadata } = (0, storage_1.getActionFiles)(this.chartDir, this.chainId, this.preset, stepName);
            const contents = JSON.parse((yield fs_extra_1.default.readFile(metadata)).toString('utf8'));
            if (contents.version !== BUILD_VERSION) {
                throw new Error('cannon file format not supported: ' + (contents.version || 1));
            }
            if (this.readMode === 'all') {
                debug('load state', stepName);
                const cacheData = yield fs_extra_1.default.readFile(chain);
                yield this.provider.send('hardhat_loadState', ['0x' + cacheData.toString('hex')]);
            }
            return contents.ctx;
        });
    }
    dumpLayer(ctx, stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.writeMode === 'none') {
                return;
            }
            debug('put cache', stepName);
            const { chain, metadata } = (0, storage_1.getActionFiles)(this.chartDir, ctx.chainId, this.preset, stepName);
            yield fs_extra_1.default.ensureDir((0, path_1.dirname)(metadata));
            yield fs_extra_1.default.writeFile(metadata, JSON.stringify({
                version: BUILD_VERSION,
                hash: yield this.actionHash(ctx, stepName),
                ctx,
            }));
            if (this.writeMode === 'all') {
                debug('put state', stepName);
                const data = yield this.provider.send('hardhat_dumpState', []);
                yield fs_extra_1.default.ensureDir((0, path_1.dirname)(chain));
                yield fs_extra_1.default.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
            }
        });
    }
    clearNode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.writeMode === 'all') {
                debug('clear state');
                // revert is assumed hardcoded to the beginning chainstate on a clearable node
                if (this.cleanSnapshot) {
                    const status = yield this.provider.send('evm_revert', [this.cleanSnapshot]);
                    if (!status) {
                        throw new Error('state clear failed');
                    }
                }
                this.cleanSnapshot = yield this.provider.send('evm_snapshot', []);
            }
            return null;
        });
    }
    loadCannonfile() {
        const file = (0, _1.getDeploymentInfoFile)(this.chartDir);
        const deployInfo = fs_extra_1.default.readJsonSync(file);
        return deployInfo.def;
    }
    writeCannonfile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode !== 'none') {
                const file = (0, _1.getDeploymentInfoFile)(this.chartDir);
                const deployInfo = yield (0, _1.getAllDeploymentInfos)(this.chartDir);
                deployInfo.def = this.def;
                yield fs_extra_1.default.mkdirp(this.chartDir);
                yield fs_extra_1.default.writeJson(file, deployInfo);
            }
        });
    }
}
exports.ChainBuilder = ChainBuilder;
