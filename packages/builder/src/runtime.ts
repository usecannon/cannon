import _ from 'lodash';
import axios from 'axios';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { CannonWrapperGenericProvider } from './error/provider';
import { ChainBuilderRuntimeInfo, ContractArtifact } from './types';

import pako from 'pako';

import Debug from 'debug';
import { DeploymentInfo } from './types';
import { CannonRegistry } from './registry';
import { getExecutionSigner } from './util';

import FormData from 'form-data';
import { RawChainDefinition } from '.';

const debug = Debug('cannon:builder:runtime');

export class ChainBuilderRuntime extends EventEmitter implements ChainBuilderRuntimeInfo {
  provider: CannonWrapperGenericProvider;
  chainId: number;
  getSigner: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;
  getArtifact: (name: string) => Promise<ContractArtifact>;
  baseDir: string | null;
  snapshots: boolean;

  private cleanSnapshot: any;

  private loadedMisc: string | null = null;
  protected misc: {
    artifacts: { [label: string]: any }
  };

  constructor(info: ChainBuilderRuntimeInfo) {
    super();

    this.provider = info.provider;
    this.chainId = info.chainId;
    this.getSigner = info.getSigner;
    this.getDefaultSigner = info.getDefaultSigner || _.partial(getExecutionSigner, this.provider);

    this.getArtifact = async (n: string) => {
      debug(`resolve artifact ${n}`);
      if (info.getArtifact) {
        debug(`need to find artifact externally`);
        this.misc.artifacts[n] = _.cloneDeep(await info.getArtifact(n));
      }

      return this.misc.artifacts[n] || null;
    };

    this.baseDir = info.baseDir;
    this.snapshots = info.snapshots;

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

  async readDeploy(packageName: string, preset: string, chainId?: number): Promise<DeploymentInfo | null> {
    throw new Error('not implemented');
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string> {
    throw new Error('not implemented');
  }

  async readMisc(url: string) {
    if (url === this.loadedMisc) {
      return;
    }

    this.readMiscInternal(url);

    this.loadedMisc = url;
  }

  protected async readMiscInternal(url: string) {
    throw new Error('not implemented');
  }

  async recordMisc(): Promise<string> {
    throw new Error('not implemented');
  }

  async restoreMisc(url: string) {
    throw new Error('not implemented');
  }
}

export class IPFSChainBuilderRuntime extends ChainBuilderRuntime {

  ipfsUrl: string;
  resolver: CannonRegistry;

  constructor(info: ChainBuilderRuntimeInfo, ipfsUrl: string, resolver: CannonRegistry) {
    super(info);

    this.ipfsUrl = ipfsUrl;
    this.resolver = resolver;
  }

  async readIpfs(hash: string): Promise<any> {
    debug(`downloading content from ${hash}`);

    const result = await axios.post(this.ipfsUrl + `/api/v0/cat?arg=${hash}`, {}, {
      responseEncoding: 'application/octet-stream',
      responseType: 'arraybuffer'
    });

    return JSON.parse(Buffer.from(await pako.inflate(result.data)).toString('utf8'));
  }

  async writeIpfs(info: any): Promise<string> {
    const data = JSON.stringify(info);

    const buf = pako.deflate(data);
    debug('upload to ipfs:', buf.length, Buffer.from(buf).length);

    const formData = new FormData();
    formData.append('data', Buffer.from(buf));
    
    const result = await axios.post(this.ipfsUrl + '/api/v0/add', formData);

    debug('upload', result.statusText, result.data.Hash);

    return result.data.Hash;
  }

  async readDeploy(packageName: string, preset: string, chainId = this.chainId): Promise<DeploymentInfo | null> {
    const h = await this.resolver.getUrl(packageName, `${chainId}-${preset}`);

    if (!h) {
      return null;
    }

    const deployInfo: DeploymentInfo = await this.readIpfs(h);

    return deployInfo;
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string> {
    const deployHash = await this.writeIpfs(deployInfo);
    return deployHash;
  }

  protected async readMiscInternal(url: string) {
    this.misc = await this.readIpfs(url.split('ipfs://')[1]);
  }

  async recordMisc(): Promise<string> {
    debug('record misc');
    return this.writeIpfs(this.misc);
  }

  async restoreMisc(url: string) {
    debug('restore misc');
    this.misc = await this.readIpfs(url);
  }
}