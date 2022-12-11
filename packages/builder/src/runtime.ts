import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { CannonWrapperGenericProvider } from './error/provider';
import { ChainBuilderRuntimeInfo, ContractArtifact } from './types';

import pako from 'pako';

import Debug from 'debug';
import { create, IPFSHTTPClient, Options } from 'ipfs-http-client';
import { DeploymentInfo, DeploymentManifest } from './types';
import { CannonRegistry } from './registry';

const debug = Debug('cannon:builder:runtime');

export class ChainBuilderRuntime extends EventEmitter implements ChainBuilderRuntimeInfo {
  provider: CannonWrapperGenericProvider;
  chainId: number;
  getSigner: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;
  getArtifact: (name: string) => Promise<ContractArtifact>;
  baseDir: string | null;
  packagesDir: string;
  packageDir: string | null;
  snapshots: boolean;

  private cleanSnapshot: any;

  private misc: {
    artifacts: { [label: string]: any }
  };

  constructor(info: ChainBuilderRuntimeInfo) {
    super();

    this.provider = info.provider;
    this.chainId = info.chainId;
    this.getSigner = info.getSigner;
    this.getDefaultSigner = info.getDefaultSigner;

    this.getArtifact = (n: string) => {
      if (info.getArtifact) {
        this.misc.artifacts[n] = this.misc.artifacts[n];
      }

      return this.misc.artifacts[n] || null;
    };

    this.baseDir = info.baseDir;
    this.packagesDir = info.packagesDir;
    this.packageDir = info.packageDir;
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

  async loadState(stateDump: Buffer): Promise<void> {
    debug('load state', stateDump.length);
    await this.provider.send('hardhat_loadState', ['0x' + stateDump.toString('hex')]);
  }
  
  async dumpState() {
    debug('dump state');
    return Buffer.from((await this.provider.send('hardhat_dumpState', [])), 'hex');
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

  async readDeploy(packageName: string, preset: string): Promise<DeploymentInfo> {
    throw new Error('not implemented');
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string> {
    throw new Error('not implemented');
  }
}

export class IPFSChainBuilderRuntime extends ChainBuilderRuntime {

  ipfsUrl: string;
  resolver: any;

  constructor(info: ChainBuilderRuntimeInfo, ipfsUrl: string, resolver: CannonRegistry) {
    super(info);

    this.ipfsUrl = ipfsUrl;
    this.resolver = resolver;
  }

  async readIpfs(hash: string): Promise<any> {
    debug(`downloading content from ${hash}`);

    const inflator = new pako.Inflate();

    const ipfsOptions = parseIpfsOptions(this.ipfsUrl);

    if (ipfsOptions) {

      const ipfs: IPFSHTTPClient = create(ipfsOptions);

      for await (const chunk of ipfs.cat(hash)) {
        inflator.push(chunk);
      }
  
      if (inflator.err) {
        throw new Error('failed decompress:' + inflator.err);
      }
    }
    else {
      const response = await fetch(`${this.ipfsUrl}/${hash}`);

      inflator.push(await response.arrayBuffer());
    }
  
    return JSON.parse(inflator.result as string);
  }

  async writeIpfs(info: any): Promise<string> {
    const data = JSON.stringify(info);

    const options = parseIpfsOptions(this.ipfsUrl);

    if (!options) {
      throw new Error('configured ipfs url is not capable of uploading packages. please supply an IPFS API URL.');
    }

    debug('upload to ipfs:')
    const ipfs: IPFSHTTPClient = create(options);
    const ipfsInfo = await ipfs.add(pako.deflate(data));

    return ipfsInfo.cid.toV0().toString();
  }

  async readDeploy(packageName: string, preset: string): Promise<DeploymentInfo> {
    const manifestHash = await this.resolver.findPackage(packageName);
    const manifest: DeploymentManifest = await this.readIpfs(manifestHash);
    const deployHash = manifest.deploys[this.chainId][preset].hash;
    const deployInfo: DeploymentInfo = await this.readIpfs(deployHash);

    return deployInfo;
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string> {
    const deployHash = await this.writeIpfs(deployInfo);

    // TODO: have to link the manifest as well

    return deployHash;
  }
}

function parseIpfsOptions(urlString: string): Options | null {
  const url = new URL(urlString);

  if (url.port == '5001' || url.protocol === 'https+ipfs' || url.protocol === 'http+ipfs') {
    const options: Options = {
      //host: url.host,
      //port: typeof url.port === 'string' ? parseInt(url.port) : url.port,
      url
    };

    return options;
  }

  return null;
}