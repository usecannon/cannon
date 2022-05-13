import _ from 'lodash';
import Debug from 'debug';
import crypto from 'crypto';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import * as persistableNode from '../persistable-node';
import contractSpec from './contract';
import importSpec from './import';
import invokeSpec from './invoke';
import keeperSpec from './keeper';
import scriptSpec from './run';

import { ChainBuilderContext, ChainDefinition, BuildOptions, OptionTypesTs } from './types';

export { validateChainDefinition } from './types';

const debug = Debug('cannon:builder');

const LAYER_VERSION = 2;

const INITIAL_CHAIN_BUILDER_CONTEXT: ChainBuilderContext = {
  fork: false,
  network: '',
  chainId: 31337,
  timestamp: '0',

  repositoryBuild: false,

  package: {},

  settings: {},
  contracts: {},

  txns: {},

  imports: {},
};

export type StorageMode = 'full' | 'metadata' | 'none';

export class ChainBuilder {
  readonly name: string;
  readonly version: string;
  readonly def: ChainDefinition;
  readonly hre: HardhatRuntimeEnvironment;

  readonly repositoryBuild: boolean;
  readonly storageMode: StorageMode;

  private ctx: ChainBuilderContext = INITIAL_CHAIN_BUILDER_CONTEXT;

  constructor({
    name,
    version,
    hre,
    def,
    storageMode,
  }: {
    name: string;
    version: string;
    hre: HardhatRuntimeEnvironment;
    def?: ChainDefinition;
    storageMode?: StorageMode;
  }) {
    this.name = name;
    this.version = version;
    this.hre = hre;
    this.def = def ?? this.loadCannonfile();

    this.repositoryBuild = !!def;

    //@ts-ignore
    if (!this.def.name) {
      throw new Error('Missing "name" property on cannonfile.toml');
    }

    //@ts-ignore
    if (!this.def.version) {
      throw new Error('Missing "version" property on cannonfile.toml');
    }

    this.storageMode = storageMode || 'none';
  }

  getDependencies() {
    if (!this.def.import) return [];

    // we have to apply templating here, only to the `source`
    // it would be best if the dep was downloaded when it was discovered to be needed, but there is not a lot we
    // can do about this right now
    return _.uniq(Object.values(this.def.import).map((d) => _.template(d.source)(this.ctx)));
  }

  async build(opts: BuildOptions): Promise<ChainBuilder> {
    debug('build');

    await this.populateSettings(this.ctx, opts);

    await this.writeCannonfile();

    const latestLayer = await this.getTopLayer();

    this.ctx = latestLayer[1];

    // have to populate settings again
    await this.populateSettings(this.ctx, opts);

    // TODO: this downcast shouldn't work in JS, ideas how to work around?
    // almost might be better to not extend the class like this.
    //const node = createdNode[1] as PersistableHardhatNode;

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

    for (const s of steps.sort()) {
      debug('step', s);

      if (await this.layerMatches(s)) {
        doLoad = s;
      } else {
        if (doLoad !== null) {
          debug(`load step ${s} from cache`);
          await this.loadLayer(doLoad);

          // repopulate settings since they may differ on this run.
          // outputs we want to keep though
          await this.populateSettings(this.ctx, opts);
          doLoad = null;
        }

        debug(`imports step ${s}`);
        for (const [name, doImport] of steppedImports[s] || []) {
          const output: { [key: string]: any } = await importSpec.exec(
            this.hre,
            this.ctx,
            importSpec.configInject(this.ctx, doImport)
          );

          this.ctx.imports[name] = output;
        }

        debug(`contracts step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name, doContract] of steppedContracts[s] || []) {
          const output = await contractSpec.exec(
            this.hre,
            this.ctx,
            contractSpec.configInject(this.ctx, doContract),
            this.getAuxilleryFilePath('contracts'),
            name
          );

          this.ctx.contracts = { ...this.ctx.contracts, ...output.contracts };
        }

        debug(`invoke step ${s}`);
        // todo: parallelization can be utilized here
        for (const [name, doInvoke] of steppedInvokes[s] || []) {
          const output = await invokeSpec.exec(
            this.hre,
            this.ctx,
            invokeSpec.configInject(this.ctx, doInvoke),
            this.getAuxilleryFilePath('contracts'),
            name
          );

          this.ctx.contracts = { ...this.ctx.contracts, ...output.contracts };
        }

        debug(`scripts step ${s}`);
        for (const [, doScript] of steppedRuns[s] || []) {
          const config = scriptSpec.configInject(this.ctx, doScript);

          // normally shouldn't be able to get here
          if (!config) {
            throw new Error(
              'tried to build step without all required files. Please contact the developer of this chain and ask them to make sure config does not affect run steps.'
            );
          }

          const output = await scriptSpec.exec(this.hre, this.ctx, config);

          this.ctx.contracts = { ...this.ctx.contracts, ...output.contracts };
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
    await this.populateSettings(ctx, opts);

    // load the cache (note: will fail if `build()` has not been called first)
    const topLayer = await this.getTopLayer();

    this.ctx = topLayer[1];

    if (await this.layerMatches(topLayer[0])) {
      await this.loadLayer(topLayer[0]);

      // run keepers
      if (Array.isArray(this.def.keeper)) {
        for (const k of this.def.keeper) {
          debug('running keeper', k);
          keeperSpec.exec(this.hre, keeperSpec.configInject(this.ctx, k));
        }
      }

      // run node
      await this.hre.run('node');
    } else {
      throw new Error('top layer is not built. Call `build` in order to execute this chain.');
    }
  }

  getOutputs() {
    return _.cloneDeep(this.ctx);
  }

  getContracts() {
    return _.cloneDeep(this.ctx.contracts);
  }

  async populateSettings(ctx: ChainBuilderContext, opts: BuildOptions) {
    const provider = this.hre.ethers.provider;
    this.ctx.timestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp.toString();

    this.ctx.repositoryBuild = this.repositoryBuild;

    const networkInfo = await this.hre.ethers.provider.getNetwork();

    this.ctx.chainId = networkInfo.chainId;

    try {
      this.ctx.package = require(path.join(this.hre.config.paths.root, 'package.json'));
    } catch {
      console.warn('package.json file not found. Cannot add to chain builder context.');
    }

    for (const s in this.def.setting || {}) {
      if (!this.def.setting?.[s]) {
        throw new Error(`Missing setting "${s}"`);
      }

      const def = this.def.setting[s];

      let value = null;
      if (def.defaultValue !== undefined) {
        value = typeof def.defaultValue === 'string' ? _.template(def.defaultValue || '')(ctx) : def.defaultValue;
      }

      // check if the value has been supplied
      if (opts[s]) {
        value = opts[s];
      }

      if (!value && def.defaultValue === undefined) {
        throw new Error(`setting not provided: ${s}`);
      }

      ctx.settings[s] = value as OptionTypesTs;
    }
  }

  async getTopLayer(): Promise<[number, ChainBuilderContext]> {
    // try to load highest file in dir
    const dirToScan = dirname((await this.getLayerFiles(0)).metadata);
    const fileList =
      (await fs.pathExists(dirToScan)) && (await fs.stat(dirToScan)).isDirectory() ? await fs.readdir(dirToScan) : [];

    const fileFilter = new RegExp(`^${this.ctx.chainId}-([0-9]*).json$`);

    const sortedFileList = _.sortBy(
      fileList
        .filter((n) => fileFilter.test(n))
        .map((n) => {
          const m = n.match(fileFilter);
          if (!m) throw new Error(`Invalid file format "${n}"`);
          return { n: parseFloat(m[1]), name: n };
        }),
      'n'
    );

    if (sortedFileList.length > 0) {
      const item = sortedFileList[sortedFileList.length - 1];

      const contents = JSON.parse((await fs.readFile(path.join(dirToScan, item.name))).toString());

      if (contents.version !== LAYER_VERSION) {
        throw new Error('cannon file format not supported');
      }

      return [item.n, contents.ctx];
    } else {
      const newCtx = INITIAL_CHAIN_BUILDER_CONTEXT;
      newCtx.network = this.hre.network.name;

      if (this.hre.network.name === 'hardhat') {
        newCtx.chainId = this.hre.network.config.chainId || 31337;

        // TODO: if we are forking, we probably want to get the chainId of the forked network instead
        newCtx.fork = !!this.hre.config.networks.hardhat.forking;
      } else {
        if (!this.hre.network.config.chainId) {
          throw new Error('chainId must be defined in selected hardhat network');
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        newCtx.chainId = this.hre.network.config.chainId!;

        // we can verify if its a fork by trying to call `evm_mine`
        try {
          await this.hre.network.provider.send('evm_mine');
          newCtx.fork = true;
        } catch (err) {
          newCtx.fork = false;
        }
      }

      return [0, newCtx];
    }
  }

  async layerMatches(n: number) {
    try {
      const contents = JSON.parse((await fs.readFile((await this.getLayerFiles(n)).metadata)).toString('utf8'));

      const newHashes = await this.layerHashes(n);

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

  static getCacheDir(cacheFolder: string, name: string, version: string) {
    return path.join(cacheFolder, 'cannon', name, version);
  }

  getCacheDir() {
    return ChainBuilder.getCacheDir(this.hre.config.paths.cache, this.name, this.version);
  }

  async getLayerFiles(n: number) {
    const filename = `${this.ctx.chainId}-${n}`;

    const basename = path.join(this.getCacheDir(), filename);

    return {
      cannonfile: path.join(this.getCacheDir(), 'cannonfile.json'),
      chain: basename + '.chain',
      metadata: basename + '.json',
    };
  }

  async layerHashes(step: number = Number.MAX_VALUE) {
    // the purpose of this is to indicate the state of the chain without accounting for
    // derivative factors (ex. contract addreseses, outputs)

    const obj: any[] = [];

    for (const d of _.filter(this.def.import, (c) => (c.step || 0) <= step)) {
      obj.push(await importSpec.getState(this.hre, this.ctx, d, this.getAuxilleryFilePath('imports')));
    }

    for (const d of _.filter(this.def.contract, (c) => (c.step || 0) <= step)) {
      obj.push(await contractSpec.getState(this.hre, this.ctx, d, this.getAuxilleryFilePath('contracts')));
    }

    for (const d of _.filter(this.def.invoke, (c) => (c.step || 0) <= step)) {
      obj.push(await invokeSpec.getState(this.hre, this.ctx, d, this.getAuxilleryFilePath('invokes')));
    }

    for (const d of _.filter(this.def.run, (c) => (c.step || 0) <= step)) {
      obj.push(await scriptSpec.getState(this.hre, this.ctx, d, this.getAuxilleryFilePath('scripts')));
    }

    return obj.map((v) => {
      if (!v) {
        return null;
      } else {
        return crypto.createHash('md5').update(JSON.stringify(v)).digest('hex');
      }
    });
  }

  clearCache() {
    fs.rmdirSync(this.getCacheDir());
  }

  async verifyLayerContext(n: number) {
    try {
      const stat = await fs.stat((await this.getLayerFiles(n)).metadata);
      return stat.isFile();
    } catch (err) {
      return false;
    }
  }

  async loadLayer(n: number) {
    debug('load cache', n);

    const { chain, metadata } = await this.getLayerFiles(n);

    const contents = JSON.parse((await fs.readFile(metadata)).toString('utf8'));

    if (contents.version !== LAYER_VERSION) {
      throw new Error('cannon file format not supported: ' + (contents.version || 1));
    }

    this.ctx = contents.ctx;

    if (this.storageMode === 'full') {
      const cacheData = await fs.readFile(chain);
      await persistableNode.loadState(this.hre, cacheData);
    }
  }

  async dumpLayer(n: number) {
    const { chain, metadata } = await this.getLayerFiles(n);

    if (this.storageMode === 'none') {
      return;
    }

    debug('put cache', n);

    await fs.ensureDir(dirname(metadata));
    await fs.writeFile(
      metadata,
      JSON.stringify({
        version: LAYER_VERSION,
        hash: await this.layerHashes(n),
        ctx: this.ctx,
      })
    );

    if (this.storageMode === 'full') {
      const data = await persistableNode.dumpState(this.hre);
      await fs.ensureDir(dirname(chain));
      await fs.writeFile(chain, data);
    }
  }

  async writeCannonfile() {
    const { cannonfile } = await this.getLayerFiles(0);
    await fs.ensureDir(dirname(cannonfile));
    await fs.writeFile(cannonfile, JSON.stringify(this.def));
  }

  loadCannonfile() {
    const file = path.join(this.getCacheDir(), 'cannonfile.json');
    return JSON.parse(fs.readFileSync(file).toString('utf8'));
  }

  getAuxilleryFilePath(category: string) {
    return path.join(this.getCacheDir(), category);
  }
}
