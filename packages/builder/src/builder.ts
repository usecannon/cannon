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
  DeploymentInfo,
  DeploymentManifest,
} from './types';
import {
  getExecutionSigner,
  getStoredArtifact,
  passThroughArtifact,
} from './util';
import { getChartDir, getLayerFiles, getSavedChartsDir } from './storage';

export { validateChainDefinition } from './types';

const debug = Debug('cannon:builder');

const LAYER_VERSION = 2;

import contractSpec from './contract';
import importSpec from './import';
import invokeSpec from './invoke';
import scriptSpec from './run';
import {
  clearDeploymentInfo,
  getAllDeploymentInfos,
  getDeploymentInfo,
  getDeploymentInfoFile,
  putDeploymentInfo,
} from '.';

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
  readonly getDefaultSigner: (
    addr: ethers.providers.TransactionRequest,
    salt?: string
  ) => Promise<ethers.Signer>;
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
    this.getDefaultSigner =
      getDefaultSigner ||
      ((txn, salt) => getExecutionSigner(provider, txn, salt));
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

  async runStep(
    type: keyof typeof StepKinds,
    label: string,
    ctx: ChainBuilderContext
  ) {
    this.currentLabel = `${type}.${label}`;

    const kind = this.def[type];
    if (!kind) {
      throw new Error('step type missing');
    }

    const cfg = kind[label];

    this.emit(Events.PreStepExecute, type, label);

    const output = await StepKinds[type].exec(
      this,
      ctx,
      StepKinds[type].configInject(ctx, cfg as any) as any
    );

    if (type === 'import') {
      ctx.imports[label] = output;
    } else {
      for (const contract in output.contracts) {
        if (ctx.contracts[contract]) {
          // name reused
          throw new Error(
            `duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${
              ctx.contracts[contract].address
            } in step ${'tbd'}`
          );
        }

        ctx.contracts[contract] = output.contracts[contract];
        this.emit(Events.DeployContract, contract, output.contracts[contract]);
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
        this.emit(Events.DeployTxn, txn, output.txns[txn]);
      }
    }

    this.emit(Events.PostStepExecute, type, label, output);

    this.currentLabel = null;
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

    const steppedImports = _.groupBy(
      _.toPairs(this.def.import),
      (c) => c[1].step || 0
    );
    const steppedContracts = _.groupBy(
      _.toPairs(this.def.contract),
      (c) => c[1].step || 0
    );
    const steppedInvokes = _.groupBy(
      _.toPairs(this.def.invoke),
      (c) => c[1].step || 0
    );
    const steppedRuns = _.groupBy(
      _.toPairs(this.def.run),
      (c) => c[1].step || 0
    );

    const steps = _.map(
      _.union(
        _.keys(steppedImports),
        _.keys(steppedContracts),
        _.keys(steppedInvokes),
        _.keys(steppedRuns)
      ),
      parseFloat
    );

    let doLoad: number | null = null;

    let ctx: ChainBuilderContext = await this.populateSettings(opts);

    for (const s of steps.sort()) {
      debug('step', s);

      const matchingCtx = await this.layerMatches(ctx, s);
      if (matchingCtx) {
        ctx = await this.augmentCtx(matchingCtx, opts); // todo this probably isnt necessary
        doLoad = s;
      } else {
        if (doLoad !== null) {
          debug(`load for step ${s} from cache`);
          const newCtx = await this.loadLayer(doLoad);

          if (!newCtx) {
            throw new Error(`could not load contet from layer ${doLoad}`);
          }

          ctx = await this.augmentCtx(newCtx, opts);

          doLoad = null;
        }

        debug(`imports step ${s}`);
        for (const [name, doImport] of steppedImports[s] || []) {
          const output: { [key: string]: any } = await importSpec.exec(
            this,
            ctx,
            importSpec.configInject(ctx, doImport)
          );

          ctx.imports[name] = output;
        }

        debug(`contracts step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name] of steppedContracts[s] || []) {
          await this.runStep('contract', name, ctx);
        }

        debug(`invoke step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name] of steppedInvokes[s] || []) {
          await this.runStep('invoke', name, ctx);
        }

        debug(`scripts step ${s}`);
        for (const [name] of steppedRuns[s] || []) {
          await this.runStep('run', name, ctx);
        }

        await this.dumpLayer(ctx, s);
      }
    }

    // if no layers were loaded, we should load the last one
    if (doLoad !== null) {
      const newCtx = await this.loadLayer(doLoad);

      if (!newCtx) {
        throw new Error(`could not load contet from layer ${doLoad}`);
      }

      ctx = newCtx;
    }

    if (this.readMode !== 'none') {
      await putDeploymentInfo(this.chartDir, ctx.chainId, this.preset, {
        options: opts,
        buildVersion: LAYER_VERSION,
        heads: [
          getLayerFiles(
            this.chartDir,
            ctx.chainId,
            this.preset,
            steps.length - 1
          ).basename,
        ],
        ipfsHash: '', // empty string means it hasn't been uploaded to ipfs
      });
    }

    return ctx;
  }

  // clean any artifacts associated with the current
  async wipe() {
    clearDeploymentInfo(this.chartDir, this.chainId, this.preset);
  }

  async getOutputs(): Promise<ChainBuilderContext | null> {
    // load all the top layers and merge their states
    const deployInfo = await getDeploymentInfo(
      this.chartDir,
      this.chainId,
      this.preset
    );

    if (!deployInfo) {
      return null;
    }

    const ctx = await this.populateSettings({});

    for (const h of deployInfo.heads) {
      const newCtx = await this.loadLayer(parseInt(_.last(h.split('/'))!));

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
        console.warn(
          'package.json file not found. Cannot add to chain builder context.'
        );
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

  async augmentCtx(
    ctx: ChainBuilderContext,
    opts: BuildOptions
  ): Promise<ChainBuilderContext> {
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
    ctx.timestamp = (
      await this.provider.getBlock(await this.provider.getBlockNumber())
    ).timestamp.toString();

    return ctx;
  }

  async layerMatches(ctx: ChainBuilderContext, n: number) {
    if (this.readMode === 'none') {
      return null;
    }

    try {
      const contents: { hash: (string | null)[]; ctx: ChainBuilderContext } =
        JSON.parse(
          (
            await fs.readFile(
              getLayerFiles(this.chartDir, ctx.chainId, this.preset, n).metadata
            )
          ).toString('utf8')
        );

      const newHashes = await this.layerHashes(ctx, n);

      debug('comparing hashes for step', contents.hash, newHashes);

      for (const hash of newHashes.values()) {
        if (!hash) {
          continue; // assumed this is a free to skip check
        } else if (contents.hash.indexOf(hash) === -1) {
          return null;
        }
      }

      debug(`layer ${n} matches`);

      return contents.ctx;
    } catch (err) {
      debug(`layer ${n} not loaded: ${err}`);
      return null;
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

  async verifyLayerContext(n: number) {
    try {
      const stat = await fs.stat(
        getLayerFiles(this.chartDir, this.chainId, this.preset, n).metadata
      );
      return stat.isFile();
    } catch (err) {
      return false;
    }
  }

  async loadLayer(n: number): Promise<ChainBuilderContext | null> {
    if (this.readMode === 'none') {
      return null;
    }

    debug('load cache', n);

    const { chain, metadata } = getLayerFiles(
      this.chartDir,
      this.chainId,
      this.preset,
      n
    );

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== LAYER_VERSION) {
      throw new Error(
        'cannon file format not supported: ' + (contents.version || 1)
      );
    }

    if (this.readMode === 'all') {
      debug('load state', n);
      const cacheData = await fs.readFile(chain);
      await this.provider.send('hardhat_loadState', [
        '0x' + cacheData.toString('hex'),
      ]);
    }

    return contents.ctx;
  }

  async dumpLayer(ctx: ChainBuilderContext, n: number) {
    if (this.writeMode === 'none') {
      return;
    }

    debug('put cache', n);

    const { chain, metadata } = getLayerFiles(
      this.chartDir,
      ctx.chainId,
      this.preset,
      n
    );

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
      const data = (await this.provider.send(
        'hardhat_dumpState',
        []
      )) as string;
      await fs.ensureDir(dirname(chain));
      await fs.writeFile(chain, Buffer.from(data.slice(2), 'hex'));
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
