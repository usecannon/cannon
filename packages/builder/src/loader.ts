import Debug from 'debug';
import { deleteIpfs, Headers, isIpfsGateway, listPinsIpfs, readIpfs, writeIpfs } from './ipfs';

const debug = Debug('cannon:builder:loader');

export interface CannonLoader {
  getLabel(): string;
  read(url: string): Promise<any | null>;
  put(misc: any): Promise<string | null>;
  list?(): Promise<string[]>;
  remove?(url: string): Promise<void>;
}

export class IPFSLoader implements CannonLoader {
  ipfsUrl: string;
  gatewayChecked = false;
  isGateway = false;
  customHeaders: Headers = {};
  timeout: number;
  retries: number;

  static PREFIX = 'ipfs://';

  constructor(ipfsUrl: string, customHeaders: Headers = {}, timeout = 300000, retries = 3) {
    this.ipfsUrl = ipfsUrl.replace('+ipfs://', '://');
    this.customHeaders = customHeaders;
    this.timeout = timeout;
    this.retries = retries;
  }

  async checkGateway() {
    if (this.gatewayChecked) return;
    this.isGateway = await isIpfsGateway(this.ipfsUrl, this.customHeaders);
    this.gatewayChecked = true;
  }

  getLabel() {
    return `ipfs ${this.ipfsUrl}`;
  }

  async put(misc: any): Promise<string> {
    await this.checkGateway();

    debug('ipfs put');

    const hash = await writeIpfs(this.ipfsUrl, misc, this.customHeaders, this.isGateway, this.timeout, this.retries);

    return IPFSLoader.PREFIX + hash;
  }

  async read(url: string) {
    await this.checkGateway();

    debug('ipfs read', url);

    return await readIpfs(
      this.ipfsUrl,
      url.replace(IPFSLoader.PREFIX, ''),
      this.customHeaders,
      this.isGateway,
      this.timeout,
      this.retries
    );
  }

  async remove(url: string) {
    await this.checkGateway();

    debug('ipfs remove', url);

    const hash = url.replace(IPFSLoader.PREFIX, '');

    await deleteIpfs(this.ipfsUrl, hash, this.customHeaders, this.isGateway, this.timeout);
  }

  async list() {
    await this.checkGateway();

    debug('ipfs list');

    return listPinsIpfs(this.ipfsUrl, this.customHeaders, this.isGateway);
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

  async put(misc: any): Promise<string> {
    const k = `mem://${this.space}/${this.idx++}`;
    this.datas.set(k, JSON.stringify(misc));

    return k;
  }
}
