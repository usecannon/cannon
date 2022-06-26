import _ from 'lodash';
import ethers from 'ethers';
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
} from './types';
import { getExecutionSigner, getStoredArtifact } from './util';
import { getChartDir, getLayerFiles, getSavedChartsDir } from './storage';

export { validateChainDefinition } from './types';

const debug = Debug('cannon:builder');

const LAYER_VERSION = 2;

import contractSpec from './contract';
import importSpec from './import';
import invokeSpec from './invoke';
import scriptSpec from './run';

export const StepKinds = {
  contract: contractSpec,
  import: importSpec,
  invoke: invokeSpec,
  run: scriptSpec,
};

export class ChainBuilder extends EventEmitter implements ChainBuilderRuntime {
  readonly name: string;
  readonly version: string;
  readonly def: ChainDefinition;

  readonly provider: ethers.providers.BaseProvider;
  readonly getSigner: (addr: string) => Promise<ethers.Signer>;
  readonly getDefaultSigner: (addr: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;
  readonly getArtifact: (name: string) => Promise<ContractArtifact>;
  readonly baseDir: string | null;
  readonly chartDir: string;

  readonly readMode: StorageMode;
  readonly writeMode: StorageMode;

  currentLabel: string | null = null;

  constructor({
    name,
    version,
    def,
    readMode,
    writeMode,

    getSigner,
    getDefaultSigner,
    getArtifact,
    provider,
    baseDir,
    savedChartsDir,
  }: Partial<ChainBuilderRuntime> &
    Pick<ChainBuilderRuntime, 'provider' | 'getSigner'> & {
      name: string;
      version: string;
      def?: ChainDefinition;
      readMode?: StorageMode;
      writeMode?: StorageMode;
      savedChartsDir?: string;
    }) {
    super();

    this.name = name;
    this.version = version;

    this.chartDir = getChartDir(savedChartsDir || getSavedChartsDir(), name, version);

    this.def = def ?? this.loadCannonfile();

    this.provider = provider;
    this.baseDir = baseDir || null;
    this.getSigner = getSigner;
    this.getDefaultSigner = getDefaultSigner || ((txn, salt) => getExecutionSigner(provider, txn, salt));
    this.getArtifact = getArtifact || ((name) => getStoredArtifact(this.chartDir, name));

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
    return _.uniq(Object.values(this.def.import).map((d) => _.template(d.source)(ctx)));
  }

  async runStep(type: keyof typeof StepKinds, label: string, ctx: ChainBuilderContext) {
    this.currentLabel = `${type}.${label}`;

    const kind = this.def[type];
    if (!kind) {
      throw new Error('step type missing');
    }

    const cfg = kind[label];

    const output = await contractSpec.exec(this, ctx, StepKinds[type].configInject(ctx, cfg as any) as any);

    this.emit('arst', type, label, output);

    if (type === 'import') {
      ctx.imports[label] = output;
    } else {
      ctx.contracts = { ...ctx.contracts, ...output.contracts };
      ctx.txns = { ...ctx.txns, ...output.txns };
    }

    this.currentLabel = null;
  }

  async build(opts: BuildOptions): Promise<ChainBuilder> {
    debug('build');
    debug(`read mode: ${this.readMode}, write mode: ${this.writeMode}`);

    if (this.writeMode !== 'none') {
      await this.writeCannonfile();
    }

    /*const latestLayer = await this.getTopLayer();

    if (latest)
    const ctx = latestLayer[1];*/

    // 1. read all settings

    // 3. do layers
    const steppedImports = _.groupBy(_.toPairs(this.def.import), (c) => c[1].step || 0);
    const steppedContracts = _.groupBy(_.toPairs(this.def.contract), (c) => c[1].step || 0);
    const steppedInvokes = _.groupBy(_.toPairs(this.def.invoke), (c) => c[1].step || 0);
    const steppedRuns = _.groupBy(_.toPairs(this.def.run), (c) => c[1].step || 0);

    const steps = _.map(
      _.union(_.keys(steppedImports), _.keys(steppedContracts), _.keys(steppedInvokes), _.keys(steppedRuns)),
      parseFloat
    );

    let doLoad: number | null = null;

    // load layer 0 context if it exists. Otherwise, populate fresh settings
    const networkInfo = await this.provider.getNetwork();
    let ctx: ChainBuilderContext = (await this.loadLayer(networkInfo.chainId, 0)) || (await this.populateSettings(opts));

    for (const s of steps.sort()) {
      debug('step', s);

      if (await this.layerMatches(ctx, s)) {
        doLoad = s;
      } else {
        if (doLoad !== null) {
          debug(`load step ${s} from cache`);
          const newCtx = await this.loadLayer(ctx.chainId, doLoad);

          if (!newCtx) {
            throw new Error(`could not load contet from layer ${doLoad}`);
          }

          ctx = newCtx;

          doLoad = null;
        }

        debug(`imports step ${s}`);
        for (const [name, doImport] of steppedImports[s] || []) {
          const output: { [key: string]: any } = await importSpec.exec(this, ctx, importSpec.configInject(ctx, doImport));

          ctx.imports[name] = output;
        }

        debug(`contracts step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name] of steppedContracts[s] || []) {
          this.runStep('contract', name, ctx);
        }

        debug(`invoke step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name] of steppedInvokes[s] || []) {
          this.runStep('invoke', name, ctx);
        }

        debug(`scripts step ${s}`);
        for (const [name] of steppedRuns[s] || []) {
          this.runStep('run', name, ctx);
        }

        await this.dumpLayer(ctx, s);
      }
    }

    // if no layers were loaded, we should load the last one
    if (doLoad !== null) {
      const newCtx = await this.loadLayer(ctx.chainId, doLoad);

      if (!newCtx) {
        throw new Error(`could not load contet from layer ${doLoad}`);
      }

      ctx = newCtx;
    }

    return this;
  }

  async getOutputs() {
    const networkInfo = await this.provider.getNetwork();
    const ctx = await this.loadLayer(networkInfo.chainId, 0);
    return _.cloneDeep(ctx);
  }

  async populateSettings(opts: BuildOptions): Promise<ChainBuilderContext> {
    const networkInfo = await this.provider.getNetwork();

    let pkg = null;
    if (this.baseDir) {
      try {
        pkg = require(path.join(this.baseDir, 'package.json'));
      } catch {
        console.warn('package.json file not found. Cannot add to chain builder context.');
      }
    }

    const timestamp = (await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

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

    return {
      settings: resolvedOpts,
      chainId: networkInfo.chainId,
      timestamp,

      package: pkg,

      contracts: {},

      txns: {},

      imports: {},
    };
  }

  async layerMatches(ctx: ChainBuilderContext, n: number) {
    try {
      const contents = JSON.parse(
        (await fs.readFile(getLayerFiles(this.chartDir, ctx.chainId, n).metadata)).toString('utf8')
      );

      const newHashes = await this.layerHashes(ctx, n);

      for (const hash of newHashes.values()) {
        if (!hash) {
          continue; // assumed this is a free to skip check
        } else if (contents.hash.indexOf(hash) === -1) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  async layerHashes(ctx: ChainBuilderContext, step: number = Number.MAX_VALUE) {
    // the purpose of this is to indicate the state of the chain without accounting for
    // derivative factors (ex. contract addreseses, outputs)

    const obj: any[] = [];

    for (const d of _.filter(this.def.import, (c) => (c.step || 0) <= step)) {
      obj.push(await importSpec.getState(this, ctx, d));
    }

    for (const d of _.filter(this.def.contract, (c) => (c.step || 0) <= step)) {
      obj.push(await contractSpec.getState(this, ctx, d));
    }

    for (const d of _.filter(this.def.invoke, (c) => (c.step || 0) <= step)) {
      obj.push(await invokeSpec.getState(this, ctx, d));
    }

    for (const d of _.filter(this.def.run, (c) => (c.step || 0) <= step)) {
      obj.push(await scriptSpec.getState(this, ctx, d));
    }

    return obj.map((v) => {
      if (!v) {
        return null;
      } else {
        return crypto.createHash('md5').update(JSON.stringify(v)).digest('hex');
      }
    });
  }

  async verifyLayerContext(chainId: number, n: number) {
    try {
      const stat = await fs.stat(getLayerFiles(this.chartDir, chainId, n).metadata);
      return stat.isFile();
    } catch (err) {
      return false;
    }
  }

  async loadLayer(chainId: number, n: number): Promise<ChainBuilderContext | null> {
    if (this.readMode === 'none') {
      return null;
    }

    debug('load cache', n);

    const { chain, metadata } = getLayerFiles(this.chartDir, chainId, n);

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== LAYER_VERSION) {
      throw new Error('cannon file format not supported: ' + (contents.version || 1));
    }

    if (this.readMode === 'all') {
      debug('load state', n);
      const cacheData = await fs.readFile(chain);
      console.log('loadded cache data', cacheData.toString());
      await this.provider.perform('hardhat_loadState', ['0x' + cacheData.toString('hex')]);
    }

    return contents.ctx;
  }

  async dumpLayer(ctx: ChainBuilderContext, n: number) {
    if (this.writeMode === 'none') {
      return;
    }

    debug('put cache', n);

    const { chain, metadata } = getLayerFiles(this.chartDir, ctx.chainId, n);

    await fs.ensureDir(dirname(metadata));
    await fs.writeFile(
      metadata,
      JSON.stringify({
        version: LAYER_VERSION,
        hash: await this.layerHashes(ctx, n),
        ctx,
      })
    );

    if (this.writeMode === 'all') {
      debug('put state', n);
      const data = (await this.provider.perform('hardhat_dumpState', [])) as string;
      await fs.ensureDir(dirname(chain));
      await fs.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
    }
  }

  async writeCannonfile() {
    const { cannonfile } = getLayerFiles(this.chartDir, 0, 0);
    await fs.ensureDir(dirname(cannonfile));
    await fs.writeFile(cannonfile, JSON.stringify(this.def));
  }

  loadCannonfile() {
    const file = path.join(this.chartDir, 'cannonfile.json');
    return JSON.parse(fs.readFileSync(file).toString('utf8'));
  }

  getAuxilleryFilePath(category: string) {
    return path.join(this.chartDir, category);
  }
}
