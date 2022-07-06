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
} from './types';
import { getExecutionSigner, getStoredArtifact, passThroughArtifact } from './util';
import { getChartDir, getLayerFiles, getSavedChartsDir } from './storage';

export { validateChainDefinition } from './types';

const debug = Debug('cannon:builder');

const LAYER_VERSION = 2;

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
  readonly chartsDir: string;
  readonly chartDir: string;

  readonly readMode: StorageMode;
  readonly writeMode: StorageMode;

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
    savedChartsDir,
  }: Partial<ChainBuilderRuntime> &
    Pick<ChainBuilderRuntime, 'provider' | 'getSigner'> & {
      name: string;
      version: string;
      chainId: number;
      def?: ChainDefinition;
      preset?: string;
      readMode?: StorageMode;
      writeMode?: StorageMode;
      savedChartsDir?: string;
    }) {
    super();

    this.name = name;
    this.version = version;

    this.chartsDir = savedChartsDir || getSavedChartsDir();
    this.chartDir = getChartDir(this.chartsDir, name, version);

    this.def = def ?? this.loadCannonfile();

    this.preset = preset ?? DEFAULT_PRESET;

    this.chainId = chainId;
    this.provider = provider;
    this.baseDir = baseDir || null;
    this.getSigner = getSigner;
    this.getDefaultSigner = getDefaultSigner || ((txn, salt) => getExecutionSigner(provider, txn, salt));
    this.getArtifact = getArtifact
      ? _.partial(passThroughArtifact, this.chartDir, getArtifact)
      : (name) => getStoredArtifact(this.chartDir, name);

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

  async runStep(type: keyof typeof StepKinds, label: string, ctx: ChainBuilderContext) {
    this.currentLabel = `${type}.${label}`;

    const kind = this.def[type];
    if (!kind) {
      throw new Error('step type missing');
    }

    const cfg = kind[label];

    this.emit(Events.PreStepExecute, type, label);

    const output = await StepKinds[type].exec(this, ctx, StepKinds[type].configInject(ctx, cfg as any) as any);

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
        this.emit(Events.DeployContract, output.contracts[contract]);
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
        this.emit(Events.DeployTxn, output.txns[txn]);
      }
    }

    this.emit(Events.PostStepExecute, type, label, output);

    this.currentLabel = null;
  }

  // runs any steps that can be immediately completed without iterating into deeper layers
  // returns the list of new steps completed.
  async runSteps(opts: BuildOptions, alreadyDone: string[]): Promise<string[]> {
    const sortedDone: {[group: string]: string[]} = _.mapValues(_.groupBy(alreadyDone, (k) => k.split('.')[0]), l => _.sortBy(l, _.identity));

    const newlyDone: string[] = [];

    const runNextStepByType = async (t: 'contract'|'invoke'|'run'|'import') => {
      const nextSteps = _.filter(
        _.toPairs(this.def[t]), ([key, conf]) => 
          _.sortedIndexOf(sortedDone[t], `${t}.${key}`) === -1 && // step itself is not already done
          _.difference(conf.depends || [], alreadyDone).length === 0 // all dependencies are already done
      );
    
      for (const [key, conf] of nextSteps) {
        await this.clearNode();
        let ctx = await this.populateSettings(opts);
        // load state for all dependencies
        for (const dep of conf.depends) {
          const newCtx = await this.loadLayer(dep);

          if (!newCtx) {
            throw new Error(`could not load contet from layer ${dep}`);
          }

          ctx = await this.augmentCtx(newCtx, opts);
        }

        await this.runStep(t, key, ctx);
        // dump state
        await this.dumpLayer(ctx, `${t}.${key}`);

        newlyDone.push(`${t}.${key}`);
      }
    }

    await runNextStepByType('import');
    await runNextStepByType('contract');
    await runNextStepByType('invoke');
    await runNextStepByType('run');

    return newlyDone;
  }

  async build(opts: BuildOptions): Promise<ChainBuilderContext> {
    debug('build');
    debug(`read mode: ${this.readMode}, write mode: ${this.writeMode}`);

    // ensure the latest cannonfile is persisted
    await this.writeCannonfile();

    const networkInfo = await this.provider.getNetwork();

    if (networkInfo.chainId !== this.chainId) {
      throw new Error(
        `provider reported chainId (${networkInfo.chainId}) does not match configured builder chain id (${this.chainId})`
      );
    }

    const allSteps: string[] = [];


    for (const step of allSteps) {
      // load ctx
      const ctx = await this.populateSettings(opts);

      if(!(await this.layerMatches(ctx, step))) {
        return ctx;
      }
    }

    let alreadyDone: string[] = [];
    let lastDone: string[] = [];

    while(alreadyDone.length < allSteps.length) {
      const lastDone = await this.runSteps(opts, alreadyDone);

      if (!lastDone.length) {
        throw new Error(
          `cannonfile is invalid: the following steps form a dependency cycle and therefore cannot be loaded:
${_.difference(allSteps, alreadyDone).join('\n')}`
        )
      }

      alreadyDone = alreadyDone.concat(lastDone);
    }

    await putDeploymentInfo(this.chartDir, this.chainId, this.preset, {
      options: opts,
      buildVersion: LAYER_VERSION,
      heads: lastDone,
      ipfsHash: '', // empty string means it hasn't been uploaded to ipfs
    });

    return ctx;
  }

  // clean any artifacts associated with the current
  async wipe() {
    clearDeploymentInfo(this.chartDir, this.chainId, this.preset);
  }

  async getOutputs(): Promise<ChainBuilderContext | null> {
    // load all the top layers and merge their states
    const deployInfo = await getDeploymentInfo(this.chartDir, this.chainId, this.preset);

    if (!deployInfo) {
      return null;
    }

    const ctx = await this.populateSettings({});

    for (const h of deployInfo.heads) {
      const newCtx = await this.loadLayer(_.last(h.split('/'))!);

      if (!newCtx) {
        throw new Error('context not declared for published layer');
      }

      // merge
      ctx.contracts = { ...ctx.contracts, ...newCtx.contracts };
      ctx.txns = { ...ctx.txns, ...newCtx.txns };
      ctx.imports = { ...ctx.imports, ...newCtx.imports };
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
      {
        settings: {},
        chainId: 0,
        timestamp: '0',

        package: pkg,

        contracts: {},

        txns: {},

        imports: {},
      },
      opts
    );
  }

  async augmentCtx(ctx: ChainBuilderContext, opts: BuildOptions): Promise<ChainBuilderContext> {
    const resolvedOpts: ChainBuilderOptions = _.clone(opts);

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
    ctx.timestamp = (await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

    return ctx;
  }

  async layerMatches(ctx: ChainBuilderContext, stepName: string) {
    if (this.readMode === 'none') {
      return null;
    }

    try {
      const contents: { hash: (string | null)[]; ctx: ChainBuilderContext } = await fs.readJson(getLayerFiles(this.chartDir, ctx.chainId, this.preset, stepName).metadata);

      const newHashes = await this.layerHashes(ctx, stepName);

      debug('comparing hashes for step', contents.hash, newHashes);

      for (const hash of newHashes.values()) {
        if (!hash) {
          continue; // assumed this is a free to skip check
        } else if (contents.hash.indexOf(hash) === -1) {
          return null;
        }
      }

      debug(`layer ${stepName} matches`);

      return contents.ctx;
    } catch (err) {
      debug(`layer ${stepName} not loaded: ${err}`);
      return null;
    }
  }

  async layerHashes(ctx: ChainBuilderContext, stepName: string) {
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

    const { chain, metadata } = getLayerFiles(this.chartDir, this.chainId, this.preset, stepName);

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== LAYER_VERSION) {
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

    const { chain, metadata } = getLayerFiles(this.chartDir, ctx.chainId, this.preset, stepName);

    await fs.ensureDir(dirname(metadata));
    await fs.writeFile(
      metadata,
      JSON.stringify({
        version: LAYER_VERSION,
        hash: await this.layerHashes(ctx, stepName),
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
      const data = (await this.provider.send('hardhat_reset', [])) as string;
    }
  }

  loadCannonfile() {
    const file = getDeploymentInfoFile(this.chartDir);
    const deployInfo = fs.readJsonSync(file) as DeploymentManifest;
    return deployInfo.def;
  }

  async writeCannonfile() {
    if (this.readMode !== 'none') {
      const file = getDeploymentInfoFile(this.chartDir);
      const deployInfo = await getAllDeploymentInfos(this.chartDir);
      deployInfo.def = this.def;
      await fs.mkdirp(this.chartDir);
      await fs.writeJson(file, deployInfo);
    }
  }
}
