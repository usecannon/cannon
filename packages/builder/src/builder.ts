/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import { ethers } from 'ethers';
import Debug from 'debug';
import fs from 'fs-extra';
import path, { dirname } from 'path';

import { EventEmitter } from 'events';

import {
  ChainBuilderContext,
  ChainBuilderRuntime,
  ContractArtifact,
  StorageMode,
  DeploymentManifest,
  DeploymentInfo,
  BuildOptions,
} from './types';

import { ChainDefinition, ActionKinds, RawChainDefinition, StateLayers } from './definition';

import { getExecutionSigner, getStoredArtifact, passThroughArtifact, printChainDefinitionProblems } from './util';
import { getPackageDir, getActionFiles, getSavedPackagesDir } from './storage';

const debug = Debug('cannon:builder');

const BUILD_VERSION = 3;

import {
  clearDeploymentInfo,
  combineCtx,
  ContractMap,
  getAllDeploymentInfos,
  getDeploymentInfo,
  getDeploymentInfoFile,
  putDeploymentInfo,
  TransactionMap,
} from '.';

export enum Events {
  PreStepExecute = 'pre-step-execute',
  PostStepExecute = 'post-step-execute',
  DeployContract = 'deploy-contract',
  DeployTxn = 'deploy-txn',
}

const DEFAULT_PRESET = 'main';

export class ChainBuilder extends EventEmitter implements ChainBuilderRuntime {
  readonly name: string;
  readonly version: string;
  readonly def: ChainDefinition;

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
      def?: ChainDefinition | RawChainDefinition;
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

    if (def) {
      this.def = (def as ChainDefinition).allActionNames
        ? (def as ChainDefinition)
        : new ChainDefinition(def as RawChainDefinition);
    } else {
      this.def = this.loadCannonfile();
    }

    this.preset = preset ?? DEFAULT_PRESET;

    this.chainId = chainId;
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

  async runStep(n: string, ctx: ChainBuilderContext) {
    this.currentLabel = n;

    const cfg = this.def.getConfig(n, ctx);
    if (!cfg) {
      throw new Error(`action ${n} missing for execution`);
    }

    const [type, label] = n.split('.') as [keyof typeof ActionKinds, string];

    this.emit(Events.PreStepExecute, type, label, cfg);
    const output = await ActionKinds[type].exec(this, ctx, cfg as any);

    if (type === 'import') {
      ctx.imports[label] = output;
    } else {
      const contracts = output.contracts as ContractMap;

      for (const contract in contracts) {
        if (ctx.contracts[contract]) {
          // name reused
          throw new Error(
            `duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${ctx.contracts[contract].address} in step ${ctx.contracts[contract].deployedOn}`
          );
        }

        ctx.contracts[contract] = contracts[contract];
        this.emit(Events.DeployContract, n, contracts[contract]);
      }

      const txns = output.txns as TransactionMap;

      for (const txn in txns) {
        if (ctx.txns[txn]) {
          // name reused
          throw new Error(
            `duplicate transaction label ${txn}. Please double check your cannonfile/scripts to ensure a txn name is used only once.
            
previous txn deployed at: ${ctx.txns[txn].hash} in step ${'tbd'}`
          );
        }

        ctx.txns[txn] = txns[txn];
        this.emit(Events.DeployTxn, n, txns[txn]);
      }
    }

    this.emit(Events.PostStepExecute, type, label, output);

    this.currentLabel = null;

    return ctx;
  }

  findNextSteps(alreadyDone: Map<string, ChainBuilderContext>): [string, { depends: string[] }][] {
    const doneActionNames = Array.from(alreadyDone.keys());

    return _.filter(
      this.def.allActionNames.map((n) => [n, _.get(this.def, n)!]) as [string, { depends: string[] }][],
      ([n, conf]) =>
        !alreadyDone.has(n) && // step itself is not already done
        _.difference(conf.depends || [], doneActionNames).length === 0 // all dependencies are already done
    );
  }

  private async buildLayer(
    baseCtx: ChainBuilderContext,
    layers: StateLayers,
    cur: string,
    ctxes: Map<string, ChainBuilderContext> = new Map()
  ) {
    const layer = layers[cur];

    // if layer is already done
    if (layer.actions.find((a) => ctxes.has(a))) {
      return;
    }

    // check all dependencies. If the dependency is not done, run the dep layer first
    for (const dep of layer.depends) {
      await this.buildLayer(baseCtx, layers, dep, ctxes);
    }

    // do all state layers match? if so, load the layer from cache and continue
    let isCompleteLayer = true;
    for (const action of layer.actions) {
      let ctx = _.cloneDeep(baseCtx);

      for (const dep of this.def.getDependencies(action)) {
        ctx = combineCtx([ctx, ctxes.get(dep)!]);
      }

      const layerActionCtx = await this.layerMatches(ctx, action);

      if (!layerActionCtx) {
        isCompleteLayer = false;
        break;
      } else {
        ctxes.set(action, layerActionCtx);
      }
    }

    // if we get here, need to run a rebuild of layer
    if (!isCompleteLayer) {
      debug('run to complete layer', layer.actions, layer.depends);
      let ctx = _.cloneDeep(baseCtx);

      if (this.writeMode === 'all') {
        await this.clearNode();
      }

      for (const dep of layer.depends) {
        ctx = combineCtx([ctx, ctxes.get(dep)!]);

        if (this.writeMode === 'all') {
          await this.loadState(dep);
        }
      }

      for (const action of layer.actions) {
        debug('run action in layer', action);
        const newCtx = await this.runStep(action, _.clone(ctx));
        ctxes.set(action, newCtx);
        await this.dumpAction(newCtx, action);
      }

      if (this.writeMode === 'all') {
        await this.dumpState(layer.actions);
      }
    } else {
      if (this.writeMode !== 'all') {
        // need to load the layer since we are not doing clear reset for write mode
        await this.loadState(layer.actions[0]);
      }
    }
  }

  async build(opts: BuildOptions): Promise<ChainBuilderContext> {
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

    //const analysis = await this.analyzeActions(opts);
    const completed = new Map<string, ChainBuilderContext>();
    const topologicalActions = this.def.topologicalActions;

    if (this.writeMode === 'all' || this.readMode === 'all') {
      const ctx = await this.populateSettings(opts);
      const layers = this.def.getStateLayers();

      for (const leaf of this.def.leaves) {
        await this.buildLayer(ctx, layers, leaf, completed);
      }
    } else {
      for (const n of topologicalActions) {
        let ctx = await this.populateSettings(opts);

        for (const dep of this.def.getDependencies(n)) {
          ctx = combineCtx([ctx, completed.get(dep)!]);
        }

        const thisStepCtx = await this.layerMatches(ctx, n);
        if (!thisStepCtx) {
          debug('run isolated', n);
          const newCtx = await this.runStep(n, ctx);
          completed.set(n, newCtx);

          if (this.writeMode !== 'none') {
            await this.dumpAction(newCtx, n);
          }
        } else {
          completed.set(n, thisStepCtx);
        }
      }
    }

    if (this.writeMode !== 'none') {
      await putDeploymentInfo(this.packageDir, this.chainId, this.preset, {
        options: opts,
        buildVersion: BUILD_VERSION,
        ipfsHash: '', // empty string means this deployment hasn't been uploaded to ipfs
        heads: Array.from(this.def.leaves),
      });
    }

    if (this.writeMode === 'all' || this.writeMode === 'metadata') {
      // reread from outputs since everything is written, will ensure fresh state
      return (await this.getOutputs())!;
    } else {
      // nothing was written so we just return what we have in the state as well as the generated ctx
      return combineCtx(Array.from(this.def.leaves).map((n) => completed.get(n)!));
    }
  }

  // clean any artifacts associated with the current
  async wipe() {
    await clearDeploymentInfo(this.packageDir, this.chainId, this.preset);
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
      const newCtx = await this.loadMeta(_.last(h.split('/'))!);

      if (this.readMode === 'all') {
        await this.loadState(h);
      }

      if (!newCtx) {
        throw new Error('context not declared for published layer');
      }

      ctx = await combineCtx([ctx, newCtx]);
    }

    return ctx;
  }

  async populateSettings(opts: BuildOptions): Promise<ChainBuilderContext> {
    let pkg = null;
    if (this.baseDir) {
      try {
        pkg = await fs.readJson(path.join(this.baseDir, 'package.json'));
      } catch {
        console.warn('package.json file not found. Cannot add to chain builder context.');
      }
    }

    const settings: ChainBuilderContext['settings'] = {};

    const pkgSettings = this.def.getSettings();

    for (const s in pkgSettings) {
      if (opts[s]) {
        settings[s] = opts[s];
      } else if (pkgSettings[s].defaultValue) {
        settings[s] = pkgSettings[s].defaultValue!;
      } else {
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
  }

  async layerMatches(ctx: ChainBuilderContext, stepName: string) {
    if (this.readMode === 'none') {
      return null;
    }

    try {
      const contents: { hash: string | null; ctx: ChainBuilderContext } = await fs.readJson(
        getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName).metadata
      );

      const newHash = await this.def.getState(stepName, this, ctx);

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

  async loadMeta(stepName: string): Promise<ChainBuilderContext | null> {
    if (this.readMode === 'none') {
      return null;
    }

    const { metadata } = getActionFiles(this.packageDir, this.chainId, this.preset, stepName);

    debug('load meta', stepName, metadata);

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== BUILD_VERSION) {
      throw new Error('cannon package format not supported: ' + (contents.version || 1));
    }

    return contents.ctx;
  }

  async loadState(stepName: string): Promise<void> {
    const { chain } = getActionFiles(this.packageDir, this.chainId, this.preset, stepName);
    debug('load state', stepName);
    const cacheData = await fs.readFile(chain);
    await this.provider.send('hardhat_loadState', ['0x' + cacheData.toString('hex')]);
  }

  async dumpAction(ctx: ChainBuilderContext, stepName: string) {
    if (this.writeMode === 'none') {
      return;
    }

    const { metadata } = getActionFiles(this.packageDir, ctx.chainId, this.preset, stepName);

    debug('put meta', metadata);

    await fs.ensureDir(dirname(metadata));
    await fs.writeFile(
      metadata,
      JSON.stringify({
        version: BUILD_VERSION,
        hash: await this.def.getState(stepName, this, ctx),
        ctx,
      })
    );
  }

  async dumpState(stepNames: string[]) {
    debug('put state', stepNames);
    const data = (await this.provider.send('hardhat_dumpState', [])) as string;

    // write the same state to all given files
    for (const n of stepNames) {
      const { chain } = getActionFiles(this.packageDir, this.chainId, this.preset, n);
      await fs.ensureDir(dirname(chain));
      await fs.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
    }
  }

  async clearNode() {
    if (this.writeMode === 'all') {
      debug('clear node');

      // revert is assumed hardcoded to the beginning chainstate on a clearable node
      if (this.cleanSnapshot) {
        const status = await this.provider.send('evm_revert', [this.cleanSnapshot]);
        if (!status) {
          throw new Error('node state clear failed');
        }
      }

      this.cleanSnapshot = await this.provider.send('evm_snapshot', []);
    }

    return null;
  }

  loadCannonfile() {
    const file = getDeploymentInfoFile(this.packageDir);
    const deployInfo = fs.readJsonSync(file) as DeploymentManifest;
    return new ChainDefinition(deployInfo.def);
  }

  async writeCannonfile() {
    if (this.readMode !== 'none') {
      const file = getDeploymentInfoFile(this.packageDir);
      const deployInfo = await getAllDeploymentInfos(this.packageDir);
      deployInfo.def = this.def.toJson();
      await fs.mkdirp(this.packageDir);
      await fs.writeJson(file, deployInfo);
    }
  }
}
