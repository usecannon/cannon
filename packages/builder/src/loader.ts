import { Headers, readIpfs, writeIpfs } from './ipfs';

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

export class InMemoryLoader implements CannonLoader {
  private datas = new Map<string, string>();
  readonly space: number;
  private idx = 0;

  constructor(space: number) {
    this.space = space;
  }

  getLabel(): string {
    return 'in memory';
  }

  async read(url: string): Promise<any | null> {
    return JSON.parse(this.datas.get(url) || 'null');
  }
  async put(misc: any): Promise<string | null> {
    const k = `mem://${this.space}/${this.idx++}`;
    this.datas.set(k, JSON.stringify(misc));

    return k;
  }
}
