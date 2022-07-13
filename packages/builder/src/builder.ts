/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import { ethers } from 'ethers';
import Debug from 'debug';
import crypto from 'crypto';
import fs from 'fs-extra';
import path, { dirname } from 'path';

import { EventEmitter } from 'events';

import {
  ChainBuilderContext,
  ChainBuilderRuntime,
  ChainDefinition,
  BuildOptions,
  OptionTypesTs,
  ContractArtifact,
  ChainBuilderOptions,
  StorageMode,
  DeploymentManifest,
  DeploymentInfo,
} from './types';
import { getExecutionSigner, getStoredArtifact, passThroughArtifact } from './util';
import { getPackageDir, getActionFiles, getSavedPackagesDir } from './storage';

export { validateChainDefinition } from './types';

const debug = Debug('cannon:builder');

const BUILD_VERSION = 3;

import contractSpec from './steps/contract';
import importSpec from './steps/import';
import invokeSpec from './steps/invoke';
import scriptSpec from './steps/run';
import { clearDeploymentInfo, getAllDeploymentInfos, getDeploymentInfo, getDeploymentInfoFile, putDeploymentInfo } from '.';

export const StepKinds = {
  contract: contractSpec,
  import: importSpec,
  invoke: invokeSpec,
  run: scriptSpec,
};

export enum Events {
  PreStepExecute = 'pre-step-execute',
  PostStepExecute = 'post-step-execute',
  DeployContract = 'deploy-contract',
  DeployTxn = 'deploy-txn',
}

/**
 * Runtime information about actions in a supplied ChainDefinition.
 * Used to complete builds and information purposes
 */
export type ActionsAnalysis = {
  // layers which are already
  matched: Map<string, ChainBuilderContext>;

  // layers which need to be built
  unmatched: Set<string>;

  // top layers, useful for saving and loading the final state
  heads: Set<string>;

  // layers which may be linked together for state purposes, and therefore should be built and saved a unit in the case of a local build (even if already built)
  layers: Map<string, { actions: string[]; depends: string[] }>;
};

const DEFAULT_PRESET = 'main';

export class ChainBuilder extends EventEmitter implements ChainBuilderRuntime {
  readonly name: string;
  readonly version: string;
  readonly def: ChainDefinition;
  readonly allActionNames: string[];

  readonly preset: string;

  readonly chainId: number;
  readonly provider: ethers.providers.JsonRpcProvider;
  readonly getSigner: (addr: string) => Promise<ethers.Signer>;
  readonly getDefaultSigner: (addr: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;
  readonly getArtifact: (name: string) => Promise<ContractArtifact>;
  readonly baseDir: string | null;
  readonly packagesDir: string;
  readonly packageDir: string;

  readonly readMode: StorageMode;
  readonly writeMode: StorageMode;

  private cleanSnapshot: number | null = null;

  currentLabel: string | null = null;

  constructor({
    name,
    version,
    def,
    preset,
    readMode,
    writeMode,

    getSigner,
    getDefaultSigner,
    getArtifact,
    chainId,
    provider,
    baseDir,
    savedPackagesDir,
  }: Partial<ChainBuilderRuntime> &
    Pick<ChainBuilderRuntime, 'provider' | 'getSigner'> & {
      name: string;
      version: string;
      chainId: number;
      def?: ChainDefinition;
      preset?: string;
      readMode?: StorageMode;
      writeMode?: StorageMode;
      savedPackagesDir?: string;
    }) {
    super();

    this.name = name;
    this.version = version;

    this.packagesDir = savedPackagesDir || getSavedPackagesDir();
    this.packageDir = getPackageDir(this.packagesDir, name, version);

    this.def = def ?? this.loadCannonfile();

    this.allActionNames = this.getAllActions();

    this.preset = preset ?? DEFAULT_PRESET;

    this.chainId = chainId;
    this.provider = provider;
    this.baseDir = baseDir || null;
    this.getSigner = getSigner;
    this.getDefaultSigner = getDefaultSigner || ((txn, salt) => getExecutionSigner(provider, txn, salt));
    this.getArtifact = getArtifact
      ? _.partial(passThroughArtifact, this.packageDir, getArtifact)
      : (name) => getStoredArtifact(this.packageDir, name);

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

  async getDependencies(opts: BuildOptions) {
    if (!this.def.import) return [];

    // we have to apply templating here, only to the `source`
    // it would be best if the dep was downloaded when it was discovered to be needed, but there is not a lot we
    // can do about this right now
    const ctx = await this.populateSettings(opts);
    return _.uniq(
      Object.values(this.def.import).map((d) => ({
        source: _.template(d.source)(ctx),
        chainId: d.chainId || this.chainId,
        preset: _.template(d.preset || 'main')(ctx),
      }))
    );
  }

  async runStep(n: string, ctx: ChainBuilderContext) {
    this.currentLabel = n;

    const cfg = _.get(this.def, n);
    if (!cfg) {
      throw new Error(`action ${n} missing for execution`);
    }

    const [type, label] = n.split('.') as [keyof typeof StepKinds, string];

    this.emit(Events.PreStepExecute, type, label);

    const injectedConfig = StepKinds[type].configInject(ctx, cfg as any) as any;

    const output = await StepKinds[type].exec(this, ctx, injectedConfig);

    if (type === 'import') {
      ctx.imports[label] = output;
    } else {
      for (const contract in output.contracts) {
        if (ctx.contracts[contract]) {
          // name reused
          throw new Error(
            `duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${ctx.contracts[contract].address} in step ${'tbd'}`
          );
        }

        ctx.contracts[contract] = output.contracts[contract];
        this.emit(Events.DeployContract, n, output.contracts[contract]);
      }

      for (const txn in output.txns) {
        if (ctx.txns[txn]) {
          // name reused
          throw new Error(
            `duplicate transaction label ${txn}. Please double check your cannonfile/scripts to ensure a txn name is used only once.
            
previous txn deployed at: ${ctx.txns[txn].hash} in step ${'tbd'}`
          );
        }

        ctx.txns[txn] = output.txns[txn];
        this.emit(Events.DeployTxn, n, output.txns[txn]);
      }
    }

    this.emit(Events.PostStepExecute, type, label, output);

    this.currentLabel = null;
  }

  findNextSteps(alreadyDone: Map<string, ChainBuilderContext>): [string, { depends: string[] }][] {
    const doneActionNames = Array.from(alreadyDone.keys());

    return _.filter(
      this.allActionNames.map((n) => [n, _.get(this.def, n)!]) as [string, { depends: string[] }][],
      ([n, conf]) =>
        !alreadyDone.has(n) && // step itself is not already done
        _.difference(conf.depends || [], doneActionNames).length === 0 // all dependencies are already done
    );
  }

  async runSteps(
    opts: BuildOptions,
    alreadyDone: Map<string, ChainBuilderContext>
  ): Promise<[string, ChainBuilderContext][]> {
    // needed in case layers
    const nextSteps = this.findNextSteps(alreadyDone);
    const newlyDone: [string, ChainBuilderContext][] = [];

    for (const [n, conf] of nextSteps) {
      let ctx = await this.populateSettings(opts);

      for (const dep of conf.depends || []) {
        ctx = await this.augmentCtx([ctx, alreadyDone.get(dep)!], opts);
      }

      debug(`run step ${n}`, conf);
      await this.runStep(n, ctx);

      // dump layer in case we are writing metadata
      await this.dumpLayer(ctx, n);

      newlyDone.push([n, ctx]);
    }

    return newlyDone;
  }

  // runs any steps that can be immediately completed without iterating into deeper layers
  // returns the list of new steps completed.
  async runRecordedSteps(
    opts: BuildOptions,
    alreadyDone: Map<string, ChainBuilderContext>,
    layers: ActionsAnalysis['layers'] | null
  ): Promise<[string, ChainBuilderContext][]> {
    // TODO: handle what happens on write mode all but read mode none
    const nextSteps = this.findNextSteps(alreadyDone);
    const newlyDone: [string, ChainBuilderContext][] = [];

    // needed in case layers
    const skipActions = new Map<string, ChainBuilderContext>();

    for (const [n, conf] of nextSteps) {
      if (skipActions.has(n)) {
        newlyDone.push([n, skipActions.get(n)!]);
        continue;
      }

      await this.clearNode();

      let ctx = await this.populateSettings(opts);

      // load full state for all dependencies
      if (layers && layers.has(n)) {
        const layerInfo = layers.get(n)!;

        for (const dep of layerInfo.depends) {
          const newCtx = await this.loadLayer(dep);

          if (!newCtx) {
            throw new Error(`could not load metadata from action ${dep}`);
          }

          ctx = await this.augmentCtx([ctx, newCtx], opts);
        }

        debug('enter layer', layerInfo.actions);
        debug('layer deps', layerInfo.depends);

        for (const otherN of layerInfo.actions) {
          debug(`run step in layer ${n}`, conf);
          // run all layer actions regarless of of they have been done already or not
          // a new layer will be recorded with all of these together
          await this.runStep(otherN, ctx);
        }

        for (const otherN of layerInfo.actions) {
          // save the fresh layer for all linked layers
          // todo: this could be a lot more efficient if `dumpLayer` took an array
          await this.dumpLayer(ctx, otherN);
          skipActions.set(otherN, ctx);
        }
      } else {
        for (const dep of conf.depends) {
          const newCtx = await this.loadLayer(dep);

          if (!newCtx) {
            throw new Error(`could not load metadata from action ${dep}`);
          }

          ctx = await this.augmentCtx([ctx, newCtx], opts);
        }

        debug(`run step ${n}`, conf);
        await this.runStep(n, ctx);
        await this.dumpLayer(ctx, n);
      }

      newlyDone.push([n, ctx]);
    }

    return newlyDone;
  }

  getAllActions() {
    const actions = [];
    for (const kind in StepKinds) {
      for (const n in this.def[kind as keyof typeof StepKinds]) {
        actions.push(`${kind}.${n}`);
      }
    }

    return _.sortBy(actions, _.identity);
  }

  async analyzeActions(
    opts: BuildOptions,
    actions = this.allActionNames,
    analysis: ActionsAnalysis = {
      matched: new Map(),
      unmatched: new Set(),
      heads: new Set(),
      layers: new Map(),
    }
  ): Promise<ActionsAnalysis> {
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

      const action = _.get(this.def, n);

      if (!action) {
        throw new Error(`action not found: ${n}`);
      }

      // if any of the depended upon actions are unmatched, this is unmatched
      let ctx = await this.populateSettings(opts);
      for (const dep of action.depends || []) {
        if (_.sortedIndexOf(this.allActionNames, dep) === -1) {
          throw new Error(`in dependencies for ${n}: '${dep}' is not a known action.

please double check your configuration. the list of known actions is:
${this.allActionNames.join('\n')}
          `);
        }

        analysis.heads.delete(dep);

        await this.analyzeActions(opts, [dep], analysis);
        if (analysis.unmatched.has(dep)) {
          analysis.unmatched.add(n);
          continue;
        } else {
          ctx = await this.augmentCtx([ctx, analysis.matched.get(dep)!], opts);
        }
      }

      // if layerMatches returns true, its matching
      const curCtx = await this.layerMatches(ctx, n);
      if (curCtx) {
        analysis.matched.set(n, curCtx);
      } else {
        analysis.unmatched.add(n);
      }
    }

    return analysis;
  }

  // on local nodes, steps depending on the same base need to be merged into "layers" to prevent state collisions
  // returns an array of layers which can be deployed as a unit in topological order
  getStateLayers(
    actions = this.allActionNames,
    layers: { [key: string]: { actions: string[]; depends: string[] } } = {},
    layerOfActions = new Map<string, string>(),
    layerDependingOn = new Map<string, string>()
  ): { [key: string]: { actions: string[]; depends: string[] } } {
    for (const n of actions) {
      if (layerOfActions.has(n)) {
        continue;
      }

      const action = _.get(this.def, n);

      if (!action) {
        throw new Error(`action not found: ${n}`);
      }

      // find a layer to attach to
      let attachingLayer: string | null = null;
      for (const dep of action.depends || []) {
        if (!layerOfActions.has(dep)) {
          this.getStateLayers([dep], layers, layerOfActions);
        }

        const depLayer = layerOfActions.get(dep)!;

        const dependingLayer = layerDependingOn.get(depLayer);

        if (dependingLayer) {
          if (attachingLayer) {
            // "merge" this entire layer into the other one
            layers[dependingLayer].actions.push(...layers[attachingLayer].actions);
            layers[dependingLayer].actions.push(...layers[attachingLayer].depends);
          } else {
            // "join" this layer
            layers[dependingLayer].actions.push(n);
          }

          attachingLayer = dependingLayer;
        } else if (attachingLayer && layers[attachingLayer].depends.indexOf(depLayer) === -1) {
          // "extend" this layer to encapsulate this
          layers[attachingLayer].depends.push(depLayer);
          layerDependingOn.set(depLayer, attachingLayer);
        }
      }

      // if never attached to layer make a new one
      if (!attachingLayer) {
        attachingLayer = n;
        layers[n] = { actions: [n], depends: (action.depends || []).map((dep: string) => layerOfActions.get(dep)!) };
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

  async build(opts: BuildOptions): Promise<ChainBuilderContext> {
    debug('build');
    debug(`read mode: ${this.readMode}, write mode: ${this.writeMode}`);

    if (this.readMode !== 'none') {
      // ensure the current deployment is supported if we try to load the files
      await this.getDeploymentInfo();
    }

    // ensure the latest cannonfile is persisted
    await this.writeCannonfile();

    const networkInfo = await this.provider.getNetwork();

    if (networkInfo.chainId !== this.chainId) {
      throw new Error(
        `provider reported chainId (${networkInfo.chainId}) does not match configured builder chain id (${this.chainId})`
      );
    }

    const analysis = await this.analyzeActions(opts);
    const loadedStates = new Set<string>();

    while (analysis.matched.size < this.allActionNames.length) {
      let lastDone;
      if (this.writeMode === 'all') {
        lastDone = await this.runRecordedSteps(opts, analysis.matched, this.writeMode === 'all' ? analysis.layers : null);
      } else {
        const nextSteps = this.findNextSteps(analysis.matched);
        // load layers for next step
        debug('load from fresh', nextSteps);
        for (const [, conf] of nextSteps) {
          for (const dep of conf.depends || []) {
            if (!loadedStates.has(dep)) {
              await this.loadLayer(dep);
              loadedStates.add(dep);
            }
          }
        }

        lastDone = await this.runSteps(opts, analysis.matched);

        for (const [n] of lastDone) {
          loadedStates.add(n);
        }
      }

      if (!lastDone.length) {
        throw new Error(
          `cannonfile is invalid: the following actions form a dependency cycle and therefore cannot be loaded:
${_.difference(this.getAllActions(), Array.from(analysis.matched.keys())).join('\n')}`
        );
      }

      for (const newLastDone of lastDone) {
        analysis.matched.set(newLastDone[0], newLastDone[1]);
      }
    }

    if (this.writeMode === 'all') {
      // have to reload state of final chain
      await this.clearNode();

      for (const n of analysis.heads) {
        await this.loadLayer(n);
      }
    } else {
      debug('loading from heads');
      for (const head of analysis.heads) {
        if (!loadedStates.has(head)) {
          await this.loadLayer(head);
        }
      }
    }

    if (this.writeMode !== 'none') {
      await putDeploymentInfo(this.packageDir, this.chainId, this.preset, {
        options: opts,
        buildVersion: BUILD_VERSION,
        ipfsHash: '', // empty string means this deployment hasn't been uploaded to ipfs
        heads: Array.from(analysis.heads),
      });
    }

    // assemble the final context for the user
    return this.augmentCtx(
      Array.from(analysis.heads).map((n) => analysis.matched.get(n)!),
      opts
    );
  }

  // clean any artifacts associated with the current
  async wipe() {
    clearDeploymentInfo(this.packageDir, this.chainId, this.preset);
  }

  async getDeploymentInfo(): Promise<DeploymentInfo | null> {
    const deployInfo = await getDeploymentInfo(this.packageDir, this.chainId, this.preset);

    if (deployInfo) {
      if (deployInfo.buildVersion < BUILD_VERSION) {
        throw new Error(`the package you have loaded is not compatible with this version of cannon.
          package build version:\t${deployInfo.buildVersion}
          supported build version:\t>=${BUILD_VERSION}`);
      }
    }

    return deployInfo;
  }

  async getOutputs(): Promise<ChainBuilderContext | null> {
    // load all the top layers and merge their states
    const deployInfo = await this.getDeploymentInfo();

    if (!deployInfo) {
      return null;
    }

    let ctx = await this.populateSettings({});

    for (const h of deployInfo.heads) {
      debug('load head for output', h);
      const newCtx = await this.loadLayer(_.last(h.split('/'))!);

      if (!newCtx) {
        throw new Error('context not declared for published layer');
      }

      ctx = await this.augmentCtx([ctx, newCtx], {});
    }

    return ctx;
  }

  async populateSettings(opts: BuildOptions): Promise<ChainBuilderContext> {
    let pkg = null;
    if (this.baseDir) {
      try {
        pkg = require(path.join(this.baseDir, 'package.json'));
      } catch {
        console.warn('package.json file not found. Cannot add to chain builder context.');
      }
    }

    return this.augmentCtx(
      [
        {
          settings: {},
          chainId: 0,
          timestamp: '0',

          package: pkg,

          contracts: {},

          txns: {},

          imports: {},
        },
      ],
      opts
    );
  }

  async augmentCtx(ctxs: ChainBuilderContext[], opts: BuildOptions): Promise<ChainBuilderContext> {
    const resolvedOpts: ChainBuilderOptions = _.clone(opts);

    const ctx = _.clone(ctxs[0]);

    for (const s in this.def.setting || {}) {
      if (!this.def.setting?.[s]) {
        throw new Error(`Missing setting "${s}"`);
      }

      const def = this.def.setting[s];

      let value: OptionTypesTs;

      // check if the value has been supplied
      if (opts[s]) {
        value = opts[s];
      } else if (def.defaultValue !== undefined) {
        value = def.defaultValue as OptionTypesTs;
      } else {
        throw new Error(`setting not provided: ${s}`);
      }

      resolvedOpts[s] = value;
    }

    ctx.settings = resolvedOpts;
    ctx.chainId = this.chainId;
    ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

    // merge all blockchain outputs
    for (const additionalCtx of ctxs.slice(1)) {
      ctx.contracts = { ...ctx.contracts, ...additionalCtx.contracts };
      ctx.txns = { ...ctx.txns, ...additionalCtx.txns };
      ctx.imports = { ...ctx.imports, ...additionalCtx.imports };
    }

    return ctx;
  }

  async layerMatches(ctx: ChainBuilderContext, stepName: string) {
    if (this.readMode === 'none') {
      return null;
    }

    try {
      const contents: { hash: string | null; ctx: ChainBuilderContext } = await fs.readJson(
        getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName).metadata
      );

      const newHash = await this.actionHash(ctx, stepName);

      debug('comparing hashes for action', contents.hash, newHash);

      if (!newHash || contents.hash === newHash) {
        return contents.ctx;
      }

      return null;
    } catch (err) {
      debug(`layer ${stepName} not loaded: ${err}`);
      return null;
    }
  }

  async actionHash(ctx: ChainBuilderContext, stepName: string) {
    // the purpose of this is to indicate the state of the chain without accounting for
    // derivative factors (ex. contract addreseses, outputs)

    const [type, name] = stepName.split('.') as [keyof typeof StepKinds, string];

    const typeConfig = this.def[type];

    if (!typeConfig || !typeConfig[name]) {
      throw new Error(`missing step: ${type}.${name}`);
    }

    const obj = await StepKinds[type].getState(this, ctx, typeConfig[name] as any);

    if (!obj) {
      return null;
    } else {
      return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
    }
  }

  async loadLayer(stepName: string): Promise<ChainBuilderContext | null> {
    if (this.readMode === 'none') {
      return null;
    }

    debug('load cache', stepName);

    const { chain, metadata } = getActionFiles(this.packageDir, this.chainId, this.preset, stepName);

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== BUILD_VERSION) {
      throw new Error('cannon file format not supported: ' + (contents.version || 1));
    }

    if (this.readMode === 'all') {
      debug('load state', stepName);
      const cacheData = await fs.readFile(chain);
      await this.provider.send('hardhat_loadState', ['0x' + cacheData.toString('hex')]);
    }

    return contents.ctx;
  }

  async dumpLayer(ctx: ChainBuilderContext, stepName: string) {
    if (this.writeMode === 'none') {
      return;
    }

    debug('put cache', stepName);

    const { chain, metadata } = getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName);

    await fs.ensureDir(dirname(metadata));
    await fs.writeFile(
      metadata,
      JSON.stringify({
        version: BUILD_VERSION,
        hash: await this.actionHash(ctx, stepName),
        ctx,
      })
    );

    if (this.writeMode === 'all') {
      debug('put state', stepName);
      const data = (await this.provider.send('hardhat_dumpState', [])) as string;
      await fs.ensureDir(dirname(chain));
      await fs.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
    }
  }

  async clearNode() {
    if (this.writeMode === 'all') {
      debug('clear state');

      // revert is assumed hardcoded to the beginning chainstate on a clearable node
      if (this.cleanSnapshot) {
        const status = await this.provider.send('evm_revert', [this.cleanSnapshot]);
        if (!status) {
          throw new Error('state clear failed');
        }
      }

      this.cleanSnapshot = await this.provider.send('evm_snapshot', []);
    }

    return null;
  }

  loadCannonfile() {
    const file = getDeploymentInfoFile(this.packageDir);
    const deployInfo = fs.readJsonSync(file) as DeploymentManifest;
    return deployInfo.def;
  }

  async writeCannonfile() {
    if (this.readMode !== 'none') {
      const file = getDeploymentInfoFile(this.packageDir);
      const deployInfo = await getAllDeploymentInfos(this.packageDir);
      deployInfo.def = this.def;
      await fs.mkdirp(this.packageDir);
      await fs.writeJson(file, deployInfo);
    }
  }
}
