import { yellow } from 'chalk';
import Debug from 'debug';
import * as viem from 'viem';
import { EventEmitter } from 'events';
import _ from 'lodash';
import { CannonSigner, ChainArtifacts, PackageReference } from './';
import { CannonLoader, IPFSLoader } from './loader';
import { CannonRegistry } from './registry';
import { traceActions } from './error';
import { ChainBuilderRuntimeInfo, ContractArtifact, DeploymentInfo } from './types';
import { getExecutionSigner } from './util';

const debug = Debug('cannon:builder:runtime');

export enum Events {
  PreStepExecute = 'pre-step-execute', // step name,
  PostStepExecute = 'post-step-execute', // step name,
  DeployContract = 'deploy-contract',
  DeployTxn = 'deploy-txn',
  DeployExtra = 'deploy-extra',
  SkipDeploy = 'skip-deploy', // step name, error causing skip
  ResolveDeploy = 'resolve-deploy',
  DownloadDeploy = 'download-deploy',
}

export class CannonStorage extends EventEmitter {
  readonly registry: CannonRegistry;
  readonly defaultLoaderScheme: string;
  readonly loaders: { [scheme: string]: CannonLoader };

  constructor(registry: CannonRegistry, loaders: { [scheme: string]: CannonLoader }, defaultLoaderScheme = 'ipfs') {
    super();
    this.registry = registry;
    this.defaultLoaderScheme = defaultLoaderScheme;
    this.loaders = loaders;
  }

  lookupLoader(url: string) {
    if (!url) {
      throw new Error('url not defined');
    }

    const loaderScheme = url.includes(':') ? url.split(':')[0] : 'ipfs';

    if (!this.loaders[loaderScheme]) {
      throw new Error(`loader scheme not configured: ${loaderScheme}`);
    }

    return this.loaders[loaderScheme];
  }

  readBlob(url: string) {
    const loader = this.lookupLoader(url);
    let loaderLabel;

    if (loader instanceof IPFSLoader) {
      loaderLabel = loader.ipfsUrl;
    } else {
      loaderLabel = loader.getLabel();
    }

    this.emit(Events.DownloadDeploy, url, loaderLabel, 0);
    return loader.read(url);
  }

  putBlob(data: any) {
    return this.loaders[this.defaultLoaderScheme].put(data);
  }

  deleteBlob(url: string) {
    const loader = this.lookupLoader(url);

    if (loader.remove) {
      return loader.remove(url);
    }
  }

  async readDeploy(packageRef: string, chainId: number): Promise<DeploymentInfo | null> {
    const registryName = this.registry.getLabel();
    const { preset } = new PackageReference(packageRef);

    this.emit(Events.ResolveDeploy, packageRef, preset, chainId, registryName, 0);

    const uri = await this.registry.getUrl(packageRef, chainId);

    if (!uri) return null;

    const deployInfo: DeploymentInfo = await this.readBlob(uri);

    return deployInfo;
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string | null> {
    return this.putBlob(deployInfo);
  }
}

const parseGasValue = (value: string | undefined) => {
  if (!value) return undefined;

  return viem.parseGwei(value).toString();
};

export class ChainBuilderRuntime extends CannonStorage implements ChainBuilderRuntimeInfo {
  provider: viem.PublicClient;
  readonly chainId: number;
  readonly getSigner: (addr: viem.Address) => Promise<CannonSigner>;
  readonly getDefaultSigner: (
    txn: Omit<viem.SendTransactionParameters, 'account' | 'chain'>,
    salt?: string
  ) => Promise<CannonSigner>;
  readonly getArtifact: (name: string) => Promise<ContractArtifact>;
  readonly snapshots: boolean;
  readonly allowPartialDeploy: boolean;
  private publicSourceCode: boolean | undefined;
  private signals: { cancelled: boolean } = { cancelled: false };
  private _gasPrice: string | undefined;
  private _gasFee: string | undefined;
  private _priorityGasFee: string | undefined;

  private cleanSnapshot: any;

  private loadedMisc: string | null = null;
  misc: {
    artifacts: { [label: string]: any };
  };

  constructor(
    info: ChainBuilderRuntimeInfo,
    registry: CannonRegistry,
    loaders: { [scheme: string]: CannonLoader } = { ipfs: new IPFSLoader('') },
    defaultLoaderScheme = 'ipfs'
  ) {
    super(registry, loaders, defaultLoaderScheme);

    if (!loaders[defaultLoaderScheme]) {
      throw new Error('default loader scheme not provided as a loader');
    }

    this.provider = info.provider;
    this.chainId = info.chainId;
    this.getSigner = info.getSigner;
    this.getDefaultSigner =
      info.getDefaultSigner || _.partial(getExecutionSigner, this.provider as viem.TestClient & viem.PublicClient);

    this.getArtifact = async (n: string) => {
      debug(`resolve artifact ${n}`);
      if (info.getArtifact) {
        debug('need to find artifact externally');
        this.reportContractArtifact(n, _.cloneDeep(await info.getArtifact(n)));
      }

      return this.misc.artifacts[n] || null;
    };

    this.snapshots = info.snapshots;

    this.allowPartialDeploy = info.allowPartialDeploy;

    this.misc = { artifacts: {} };

    if (info.priorityGasFee) {
      if (!info.gasFee) {
        throw new Error('priorityGasFee requires gasFee');
      }
    }

    this._gasFee = parseGasValue(info.gasFee);
    this._priorityGasFee = parseGasValue(info.priorityGasFee);

    if (info.gasPrice) {
      if (info.gasFee) {
        debug(yellow('WARNING: gasPrice is ignored when gasFee is set'));
      } else {
        this._gasPrice = parseGasValue(info.gasPrice);
      }
    }
  }

  cancel() {
    this.signals.cancelled = true;
  }

  get gasPrice(): string | undefined {
    return this._gasPrice;
  }
  get gasFee(): string | undefined {
    return this._gasFee;
  }
  get priorityGasFee(): string | undefined {
    return this._priorityGasFee;
  }

  isCancelled() {
    return this.signals.cancelled;
  }

  async checkNetwork() {
    const chainId = await this.provider.getChainId();
    if (chainId !== this.chainId) {
      throw new Error(
        `provider network reported chainId (${chainId}) does not match configured deployment chain id (${this.chainId})`
      );
    }
  }

  async loadState(stateDump: viem.Hex): Promise<void> {
    if (this.snapshots) {
      debug('load state', stateDump.length);
      await (this.provider as viem.TestClient & viem.PublicClient).loadState({ state: stateDump });
      // after loading state, sometimes block cannot be found during waitForTransactionReceipt check. So just mine a block to ensure it exists
      await (this.provider as viem.TestClient & viem.PublicClient).mine({ blocks: 1 });
    }
  }

  async dumpState() {
    if (this.snapshots) {
      debug('dump state');
      return await (this.provider as viem.TestClient & viem.PublicClient).dumpState();
    }

    return null;
  }

  async clearNode() {
    if (this.snapshots) {
      debug('clear node');

      // revert is assumed hardcoded to the beginning chainstate on a clearable node
      if (this.cleanSnapshot) {
        await (this.provider as viem.TestClient & viem.PublicClient).revert({ id: this.cleanSnapshot });
      }

      this.cleanSnapshot = await (this.provider as viem.TestClient & viem.PublicClient).snapshot();
    }
  }

  async recordMisc() {
    return await this.loaders[this.defaultLoaderScheme].put(this.misc);
  }

  async restoreMisc(url: string) {
    if (url === this.loadedMisc) {
      return;
    }

    this.misc = await this.readBlob(url);

    this.loadedMisc = url;
  }

  reportContractArtifact(n: string, artifact: ContractArtifact) {
    if (!this.publicSourceCode) {
      delete artifact.source;
    }

    debug('reported contract artifact', n, artifact);

    this.misc.artifacts[n] = artifact;
  }

  updateProviderArtifacts(artifacts: ChainArtifacts) {
    this.provider = this.provider.extend(traceActions(artifacts) as any);
  }

  setPublicSourceCode(isPublic: boolean) {
    this.publicSourceCode = isPublic;
  }

  derive(overrides: Partial<ChainBuilderRuntimeInfo>): ChainBuilderRuntime {
    const newRuntime = new ChainBuilderRuntime(
      { ...this, ...overrides },
      this.registry,
      this.loaders,
      this.defaultLoaderScheme
    );

    newRuntime.signals = this.signals;

    if (!overrides.gasPrice) newRuntime._gasPrice = this.gasPrice;
    if (!overrides.gasFee) newRuntime._gasFee = this.gasFee;
    if (!overrides.priorityGasFee) newRuntime._priorityGasFee = this.priorityGasFee;

    // forward any events which come from our child
    newRuntime.on(Events.PreStepExecute, (t, n, c, d) => this.emit(Events.PreStepExecute, t, n, c, d + 1));
    newRuntime.on(Events.PostStepExecute, (t, n, cfg, ctx, result, d) =>
      this.emit(Events.PostStepExecute, t, n, cfg, ctx, result, d + 1)
    );
    newRuntime.on(Events.DeployContract, (n, c, d) => this.emit(Events.DeployContract, n, c, d + 1));
    newRuntime.on(Events.DeployTxn, (n, t, d) => this.emit(Events.DeployTxn, n, t, d + 1));
    newRuntime.on(Events.DeployExtra, (n, v, d) => this.emit(Events.DeployExtra, n, v, d + 1));
    newRuntime.on(Events.SkipDeploy, (n, e, d) => this.emit(Events.SkipDeploy, n, e, d + 1));
    newRuntime.on(Events.ResolveDeploy, (packageName, preset, chainId, registry, d) =>
      this.emit(Events.ResolveDeploy, packageName, preset, chainId, registry, d + 1)
    );
    newRuntime.on(Events.DownloadDeploy, (hash, gateway, d) => this.emit(Events.DownloadDeploy, hash, gateway, d + 1));

    return newRuntime;
  }
}
