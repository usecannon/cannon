import _ from 'lodash';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { CannonWrapperGenericProvider } from './error/provider';
import { ChainBuilderRuntimeInfo, ContractArtifact } from './types';

import Debug from 'debug';
import { getExecutionSigner } from './util';
import { CannonLoader } from './loader';

const debug = Debug('cannon:builder:runtime');

export enum Events {
  PreStepExecute = 'pre-step-execute', // step name,
  PostStepExecute = 'post-step-execute', // step name,
  DeployContract = 'deploy-contract',
  DeployTxn = 'deploy-txn',
  DeployExtra = 'deploy-extra',
  SkipDeploy = 'skip-deploy', // step name, error causing skip
}

export class ChainBuilderRuntime extends EventEmitter implements ChainBuilderRuntimeInfo {
  provider: CannonWrapperGenericProvider;
  chainId: number;
  getSigner: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;
  getArtifact: (name: string) => Promise<ContractArtifact>;
  baseDir: string | null;
  snapshots: boolean;
  allowPartialDeploy: boolean;
  publicSourceCode: boolean | undefined;

  private cleanSnapshot: any;

  readonly loader: CannonLoader;

  private loadedMisc: string | null = null;
  protected misc: {
    artifacts: { [label: string]: any };
  };

  constructor(info: ChainBuilderRuntimeInfo, loader: CannonLoader) {
    super();

    this.loader = loader;

    this.provider = info.provider;
    this.chainId = info.chainId;
    this.getSigner = info.getSigner;
    this.getDefaultSigner = info.getDefaultSigner || _.partial(getExecutionSigner, this.provider);

    this.getArtifact = async (n: string) => {
      debug(`resolve artifact ${n}`);
      if (info.getArtifact) {
        debug('need to find artifact externally');
        this.reportContractArtifact(n, _.cloneDeep(await info.getArtifact(n)));
      }

      return this.misc.artifacts[n] || null;
    };

    this.baseDir = info.baseDir;
    this.snapshots = info.snapshots;

    this.allowPartialDeploy = info.allowPartialDeploy;

    this.publicSourceCode = info.publicSourceCode;

    this.misc = { artifacts: {} };
  }

  async checkNetwork() {
    const networkInfo = await this.provider.getNetwork();
    if (networkInfo.chainId !== this.chainId) {
      throw new Error(
        `provider network reported chainId (${networkInfo.chainId}) does not match configured deployment chain id (${this.chainId})`
      );
    }
  }

  async loadState(stateDump: string): Promise<void> {
    if (this.snapshots) {
      debug('load state', stateDump.length);
      await this.provider.send('hardhat_loadState', [stateDump]);
    }
  }

  async dumpState() {
    if (this.snapshots) {
      debug('dump state');
      return await this.provider.send('hardhat_dumpState', []);
    }

    return null;
  }

  async clearNode() {
    if (this.snapshots) {
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
  }

  async recordMisc() {
    return await this.loader.putMisc(this.misc);
  }

  async restoreMisc(url: string) {
    if (url === this.loadedMisc) {
      return;
    }

    this.misc = await this.loader.readMisc(url);

    this.loadedMisc = url;
  }

  reportContractArtifact(n: string, artifact: ContractArtifact) {
    if (!this.publicSourceCode) {
      delete artifact.source;
    }

    debug('reported contract artifact', n, artifact);

    this.misc.artifacts[n] = artifact;
  }

  derive(overrides: Partial<ChainBuilderRuntimeInfo>): ChainBuilderRuntime {
    const newRuntime = new ChainBuilderRuntime({ ...this, ...overrides }, this.loader);

    // forward any events which come from our child
    newRuntime.on(Events.PreStepExecute, (t, n, c, d) => this.emit(Events.PreStepExecute, t, n, c, d + 1));
    newRuntime.on(Events.PostStepExecute, (t, n, o, d) => this.emit(Events.PostStepExecute, t, n, o, d + 1));
    newRuntime.on(Events.DeployContract, (n, c, d) => this.emit(Events.DeployContract, n, c, d + 1));
    newRuntime.on(Events.DeployTxn, (n, t, d) => this.emit(Events.DeployTxn, n, t, d + 1));
    newRuntime.on(Events.DeployExtra, (n, v, d) => this.emit(Events.DeployExtra, n, v, d + 1));
    newRuntime.on(Events.SkipDeploy, (n, e, d) => this.emit(Events.SkipDeploy, n, e, d + 1));

    return newRuntime;
  }
}
