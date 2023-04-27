import { Headers, readIpfs, writeIpfs } from './ipfs';
import { CannonRegistry } from './registry';
import { DeploymentInfo } from './types';

import Debug from 'debug';

const debug = Debug('cannon:builder:loader');

export interface CannonLoader {
  resolver: CannonRegistry;
  getLabel(): string;
  readDeploy(packageName: string, preset: string, chainId: number): Promise<DeploymentInfo | null>;
  putDeploy(deployInfo: DeploymentInfo): Promise<string | null>;
  readMisc(url: string): Promise<any | null>;
  putMisc(misc: any): Promise<string | null>;
}

export class IPFSLoader implements CannonLoader {
  ipfsUrl: string;
  resolver: CannonRegistry;
  customHeaders: Headers = {};

  static PREFIX = 'ipfs://';

  constructor(ipfsUrl: string, resolver: CannonRegistry, customHeaders: Headers = {}) {
    this.ipfsUrl = ipfsUrl;
    this.resolver = resolver;
    this.customHeaders = customHeaders;
  }

  getLabel() {
    return `ipfs ${this.ipfsUrl} + ${this.resolver.getLabel()}`;
  }

  async readDeploy(packageName: string, preset: string, chainId: number) {
    const uri = await this.resolver.getUrl(packageName, `${chainId}-${preset}`);
    return uri ? ((await this.readMisc(uri)) as DeploymentInfo) : null;
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string | null> {
    const deployHash = await writeIpfs(this.ipfsUrl, deployInfo, this.customHeaders);
    return deployHash ? IPFSLoader.PREFIX + deployHash : deployHash;
  }

  async putMisc(misc: any): Promise<string | null> {
    debug('record misc');

    const hash = await writeIpfs(this.ipfsUrl, misc, this.customHeaders);

    return hash ? IPFSLoader.PREFIX + hash : hash;
  }

  async readMisc(url: string) {
    debug('restore misc');
    return await readIpfs(this.ipfsUrl, url.replace(IPFSLoader.PREFIX, ''), this.customHeaders);
  }
}
