import { readIpfs, writeIpfs } from "./ipfs";
import { CannonRegistry } from "./registry";
import { DeploymentInfo } from "./types";

import Debug from 'debug';

const debug = Debug('cannon:builder:loader');

export interface CannonLoader {
    readDeploy(packageName: string, preset: string, chainId: number): Promise<DeploymentInfo | null>;
    putDeploy(deployInfo: DeploymentInfo): Promise<string | null>;
    readMisc(url: string): Promise<any | null>;
    putMisc(misc: any): Promise<string | null>;
}

export class IPFSLoader implements CannonLoader {
    ipfsUrl: string;
    resolver: CannonRegistry;
  
    static PREFIX = 'ipfs://';
  
    constructor(ipfsUrl: string, resolver: CannonRegistry) {
      this.ipfsUrl = ipfsUrl;
      this.resolver = resolver;
    }
  
    async readDeploy(packageName: string, preset: string, chainId: number): Promise<DeploymentInfo | null> {
      const h = await this.resolver.getUrl(packageName, `${chainId}-${preset}`);
  
      if (!h) {
        return null;
      }
  
      const deployInfo: DeploymentInfo = await readIpfs(this.ipfsUrl, h.replace(IPFSLoader.PREFIX, ''));
  
      return deployInfo;
    }
  
    async putDeploy(deployInfo: DeploymentInfo): Promise<string | null> {
      const deployHash = await writeIpfs(this.ipfsUrl, deployInfo);
      return deployHash ? IPFSLoader.PREFIX + deployHash : deployHash;
    }
  
    protected async readMiscInternal(url: string) {
      return await readIpfs(this.ipfsUrl, url.split(IPFSLoader.PREFIX)[1]);
    }
  
    async putMisc(misc: any): Promise<string | null> {
      debug('record misc');
      const hash = await writeIpfs(this.ipfsUrl, misc);
      return hash ? IPFSLoader.PREFIX + hash : hash;
    }
  
    async readMisc(url: string) {
      debug('restore misc');
      return await readIpfs(this.ipfsUrl, url.replace(IPFSLoader.PREFIX, ''));
    }
  }