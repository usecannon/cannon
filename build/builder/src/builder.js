var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import Debug from 'debug';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { EventEmitter } from 'events';
import { ChainDefinition, ActionKinds } from './definition';
import { getExecutionSigner, getStoredArtifact, passThroughArtifact, printChainDefinitionProblems } from './util';
import { getPackageDir, getActionFiles, getSavedPackagesDir } from './storage';
const debug = Debug('cannon:builder');
const BUILD_VERSION = 3;
import { clearDeploymentInfo, combineCtx, getAllDeploymentInfos, getDeploymentInfo, getDeploymentInfoFile, putDeploymentInfo, } from '.';
import { handleTxnError } from './error';
export var Events;
(function (Events) {
    Events["PreStepExecute"] = "pre-step-execute";
    Events["PostStepExecute"] = "post-step-execute";
    Events["DeployContract"] = "deploy-contract";
    Events["DeployTxn"] = "deploy-txn";
})(Events || (Events = {}));
const DEFAULT_PRESET = 'main';
export class ChainBuilder extends EventEmitter {
    constructor({ name, version, def, preset, readMode, writeMode, getSigner, getDefaultSigner, getArtifact, chainId, provider, baseDir, savedPackagesDir, }) {
        super();
        this.cleanSnapshot = null;
        this.currentLabel = null;
        this.name = name;
        this.version = version;
        this.packagesDir = savedPackagesDir || getSavedPackagesDir();
        this.packageDir = getPackageDir(this.packagesDir, name, version);
        this.preset = preset !== null && preset !== void 0 ? preset : DEFAULT_PRESET;
        this.chainId = chainId;
        if (def) {
            this.def = def.allActionNames
                ? def
                : new ChainDefinition(def);
        }
        else {
            this.def = this.loadCannonfile();
        }
        this.provider = provider;
        this.baseDir = baseDir || null;
        this.getSigner = getSigner;
        this.getDefaultSigner = getDefaultSigner || ((txn, salt) => getExecutionSigner(provider, txn, salt));
        this.getArtifact = getArtifact
            ? _.partial(passThroughArtifact, this.packageDir, getArtifact)
            : (name) => getStoredArtifact(this.packageDir, name);
        this.readMode = readMode || 'none';
        this.writeMode = writeMode || 'none';
    }
    runStep(n, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentLabel = n;
            const cfg = this.def.getConfig(n, ctx);
            if (!cfg) {
                throw new Error(`action ${n} missing for execution`);
            }
            const [type, label] = n.split('.');
            this.emit(Events.PreStepExecute, type, label, cfg);
            let output;
            try {
                output = yield ActionKinds[type].exec(this, ctx, cfg);
            }
            catch (err) {
                handleTxnError(ctx, this.provider, err);
                // note: technically `handleTxnError` reverts so ctx is unset
                return ctx;
            }
            if (type === 'import') {
                ctx.imports[label] = output;
            }
            else {
                const contracts = output.contracts;
                for (const contract in contracts) {
                    if (ctx.contracts[contract]) {
                        // name reused
                        throw new Error(`duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${ctx.contracts[contract].address} in step ${ctx.contracts[contract].deployedOn}`);
                    }
                    ctx.contracts[contract] = contracts[contract];
                    this.emit(Events.DeployContract, n, contracts[contract]);
                }
                const txns = output.txns;
                for (const txn in txns) {
                    if (ctx.txns[txn]) {
                        // name reused
                        throw new Error(`duplicate transaction label ${txn}. Please double check your cannonfile/scripts to ensure a txn name is used only once.

previous txn deployed at: ${ctx.txns[txn].hash} in step ${'tbd'}`);
                    }
                    ctx.txns[txn] = txns[txn];
                    this.emit(Events.DeployTxn, n, txns[txn]);
                }
            }
            this.emit(Events.PostStepExecute, type, label, output);
            this.currentLabel = null;
            return ctx;
        });
    }
    findNextSteps(alreadyDone) {
        const doneActionNames = Array.from(alreadyDone.keys());
        return _.filter(this.def.allActionNames.map((n) => [n, _.get(this.def, n)]), ([n, conf]) => !alreadyDone.has(n) && // step itself is not already done
            _.difference(conf.depends || [], doneActionNames).length === 0 // all dependencies are already done
        );
    }
    buildLayer(baseCtx, layers, cur, ctxes = new Map(), tainted = new Set()) {
        return __awaiter(this, void 0, void 0, function* () {
            const layer = layers[cur];
            // if layer is already done
            if (layer.actions.find((a) => ctxes.has(a))) {
                return;
            }
            // check all dependencies. If the dependency is not done, run the dep layer first
            let isCompleteLayer = true;
            for (const dep of layer.depends) {
                yield this.buildLayer(baseCtx, layers, dep, ctxes, tainted);
                // if a prior layer had to be rebuilt, we must rebuild the current layer as well
                isCompleteLayer = isCompleteLayer && !tainted.has(dep);
            }
            // do all state layers match? if so, load the layer from cache and continue
            if (isCompleteLayer) {
                for (const action of layer.actions) {
                    let ctx = _.cloneDeep(baseCtx);
                    for (const dep of this.def.getDependencies(action)) {
                        ctx = combineCtx([ctx, ctxes.get(dep)]);
                    }
                    const layerActionCtx = yield this.layerMatches(ctx, action);
                    if (!layerActionCtx) {
                        isCompleteLayer = false;
                        break;
                    }
                    else {
                        ctxes.set(action, layerActionCtx);
                    }
                }
            }
            else {
                debug(`layer for ${cur} is tainted, not checking hashes`);
            }
            // if we get here, need to run a rebuild of layer
            if (!isCompleteLayer) {
                debug('run to complete layer', layer.actions, layer.depends);
                let ctx = _.cloneDeep(baseCtx);
                if (this.writeMode === 'all') {
                    yield this.clearNode();
                }
                for (const dep of layer.depends) {
                    ctx = combineCtx([ctx, ctxes.get(dep)]);
                    if (this.writeMode === 'all') {
                        yield this.loadState(dep);
                    }
                }
                for (const action of layer.actions) {
                    debug('run action in layer', action);
                    const newCtx = yield this.runStep(action, _.clone(ctx));
                    ctxes.set(action, newCtx);
                    tainted.add(action);
                    yield this.dumpAction(newCtx, action);
                }
                if (this.writeMode === 'all') {
                    yield this.dumpState(layer.actions);
                }
            }
            else {
                if (this.writeMode !== 'all') {
                    // need to load the layer since we are not doing clear reset for write mode
                    yield this.loadState(layer.actions[0]);
                }
            }
        });
    }
    build(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('preflight');
            const problems = this.def.checkAll();
            if (problems) {
                throw new Error(`Your cannonfile is invalid: please resolve the following issues before building your project:
${printChainDefinitionProblems(problems)}`);
            }
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
            //const analysis = await this.analyzeActions(opts);
            const completed = new Map();
            const topologicalActions = this.def.topologicalActions;
            if (this.writeMode === 'all' || this.readMode === 'all') {
                const ctx = yield this.populateSettings(opts);
                const layers = this.def.getStateLayers();
                for (const leaf of this.def.leaves) {
                    yield this.buildLayer(ctx, layers, leaf, completed);
                }
            }
            else {
                for (const n of topologicalActions) {
                    let ctx = yield this.populateSettings(opts);
                    for (const dep of this.def.getDependencies(n)) {
                        ctx = combineCtx([ctx, completed.get(dep)]);
                    }
                    const thisStepCtx = yield this.layerMatches(ctx, n);
                    if (!thisStepCtx) {
                        debug('run isolated', n);
                        const newCtx = yield this.runStep(n, ctx);
                        completed.set(n, newCtx);
                        if (this.writeMode !== 'none') {
                            yield this.dumpAction(newCtx, n);
                        }
                    }
                    else {
                        completed.set(n, thisStepCtx);
                    }
                }
            }
            if (this.writeMode !== 'none') {
                yield putDeploymentInfo(this.packageDir, this.chainId, this.preset, {
                    def: this.def.toJson(),
                    options: opts,
                    buildVersion: BUILD_VERSION,
                    ipfsHash: '',
                    heads: Array.from(this.def.leaves),
                });
            }
            if (this.writeMode === 'all' || this.writeMode === 'metadata') {
                // reread from outputs since everything is written, will ensure fresh state
                return (yield this.getOutputs());
            }
            else {
                // nothing was written so we just return what we have in the state as well as the generated ctx
                return combineCtx(Array.from(this.def.leaves).map((n) => completed.get(n)));
            }
        });
    }
    // clean any artifacts associated with the current
    wipe() {
        return __awaiter(this, void 0, void 0, function* () {
            yield clearDeploymentInfo(this.packageDir, this.chainId, this.preset);
        });
    }
    getDeploymentInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const deployInfo = yield getDeploymentInfo(this.packageDir, this.chainId, this.preset);
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
                const newCtx = yield this.loadMeta(_.last(h.split('/')));
                if (!newCtx) {
                    throw new Error('context not declared for published layer');
                }
                ctx = yield combineCtx([ctx, newCtx]);
            }
            if (this.readMode === 'all') {
                // need to load state as well. the states that we want to load are the "leaf" layers
                const layers = _.uniq(Object.values(this.def.getStateLayers()));
                layerSearch: for (const layer of layers) {
                    for (const action of layer.actions) {
                        if (layers.find((l) => l.depends.indexOf(action) !== -1)) {
                            // this isnt a leaf
                            continue layerSearch;
                        }
                    }
                    yield this.loadState(layer.actions[0]);
                }
            }
            return ctx;
        });
    }
    populateSettings(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let pkg = null;
            if (this.baseDir) {
                try {
                    pkg = yield fs.readJson(path.join(this.baseDir, 'package.json'));
                }
                catch (_a) {
                    console.warn('package.json file not found. Cannot add to chain builder context.');
                }
            }
            const settings = {};
            const pkgSettings = this.def.getSettings();
            for (const s in pkgSettings) {
                if (opts[s]) {
                    settings[s] = opts[s];
                }
                else if (pkgSettings[s].defaultValue) {
                    settings[s] = pkgSettings[s].defaultValue;
                }
                else {
                    throw new Error(`required setting not supplied: ${s}`);
                }
            }
            return {
                settings,
                chainId: this.chainId,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                package: pkg,
                contracts: {},
                txns: {},
                imports: {},
            };
        });
    }
    layerMatches(ctx, stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode === 'none') {
                return null;
            }
            try {
                const contents = yield fs.readJson(getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName).metadata);
                const newHash = yield this.def.getState(stepName, this, ctx);
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
    loadMeta(stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode === 'none') {
                return null;
            }
            const { metadata } = getActionFiles(this.packageDir, this.chainId, this.preset, stepName);
            debug('load meta', stepName, metadata);
            const contents = JSON.parse((yield fs.readFile(metadata)).toString('utf8'));
            if (contents.version !== BUILD_VERSION) {
                throw new Error('cannon package format not supported: ' + (contents.version || 1));
            }
            return contents.ctx;
        });
    }
    loadState(stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            const { chain } = getActionFiles(this.packageDir, this.chainId, this.preset, stepName);
            debug('load state', stepName);
            const cacheData = yield fs.readFile(chain);
            yield this.provider.send('hardhat_loadState', ['0x' + cacheData.toString('hex')]);
        });
    }
    dumpAction(ctx, stepName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.writeMode === 'none') {
                return;
            }
            const { metadata } = getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName);
            debug('put meta', metadata);
            yield fs.ensureDir(dirname(metadata));
            yield fs.writeFile(metadata, JSON.stringify({
                version: BUILD_VERSION,
                hash: yield this.def.getState(stepName, this, ctx),
                ctx,
            }));
        });
    }
    dumpState(stepNames) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('put state', stepNames);
            const data = (yield this.provider.send('hardhat_dumpState', []));
            // write the same state to all given files
            for (const n of stepNames) {
                const { chain } = getActionFiles(this.packageDir, this.chainId, this.preset, n);
                yield fs.ensureDir(dirname(chain));
                yield fs.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
            }
        });
    }
    clearNode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.writeMode === 'all') {
                debug('clear node');
                // revert is assumed hardcoded to the beginning chainstate on a clearable node
                if (this.cleanSnapshot) {
                    const status = yield this.provider.send('evm_revert', [this.cleanSnapshot]);
                    if (!status) {
                        throw new Error('node state clear failed');
                    }
                }
                this.cleanSnapshot = yield this.provider.send('evm_snapshot', []);
            }
            return null;
        });
    }
    loadCannonfile() {
        const file = getDeploymentInfoFile(this.packageDir);
        const deployInfo = fs.readJsonSync(file);
        // try to load the chain definition specific to this chain
        // otherwise, load the top level definition
        const rawDefinition = _.get(deployInfo.deploys, [this.chainId.toString(), this.preset, 'def'], deployInfo.def);
        return new ChainDefinition(rawDefinition);
    }
    writeCannonfile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.readMode !== 'none') {
                const file = getDeploymentInfoFile(this.packageDir);
                const deployInfo = yield getAllDeploymentInfos(this.packageDir);
                // only store the current chain definition if we are building the local network id and main preset
                deployInfo.def = this.chainId === 31337 && this.preset === 'main' ? this.def.toJson() : deployInfo.def;
                yield fs.mkdirp(this.packageDir);
                yield fs.writeJson(file, deployInfo);
            }
        });
    }
}
