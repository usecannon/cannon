import { Headers, readIpfs, writeIpfs } from './ipfs';
import { CannonRegistry } from './registry';
import { DeploymentInfo } from './types';

import Debug from 'debug';

const debug = Debug('cannon:builder:loader');

export interface CannonLoader {
  getLabel(): string;
  read(url: string): Promise<any | null>;
  put(misc: any): Promise<string | null>;
}

export class IPFSLoader implements CannonLoader {
  ipfsUrl: string;
  customHeaders: Headers = {};

  static PREFIX = 'ipfs://';

  constructor(ipfsUrl: string, customHeaders: Headers = {}) {
    this.ipfsUrl = ipfsUrl;
    this.customHeaders = customHeaders;
  }

  getLabel() {
    return `ipfs ${this.ipfsUrl}`;
  }

  protected async readMiscInternal(url: string) {
    return await readIpfs(this.ipfsUrl, url.split(IPFSLoader.PREFIX)[1], this.customHeaders);
  }

  async put(misc: any): Promise<string | null> {
    debug('ipfs put');

    const hash = await writeIpfs(this.ipfsUrl, misc, this.customHeaders);

    return hash ? IPFSLoader.PREFIX + hash : hash;
  }

  async read(url: string) {
    debug('ipfs read', url);

    return await readIpfs(this.ipfsUrl, url.replace(IPFSLoader.PREFIX, ''), this.customHeaders);
  }
}
