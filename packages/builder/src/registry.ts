import path from 'path';
import { ethers, Overrides } from 'ethers';
import Debug from 'debug';

import { associateTag } from './storage';
import fs from 'fs-extra';

import { getAllDeploymentInfos, getPackageDir, getDeploymentInfoFile, getActionFiles, getSavedPackagesDir } from '.';

import { IPFSHTTPClient, create, Options } from 'ipfs-http-client';
import { DeploymentInfo, DeploymentManifest } from './types';
import AdmZip from 'adm-zip';

import CannonRegistryAbi from './abis/CannonRegistry.json';

import fetch from 'node-fetch';
import _ from 'lodash';

const debug = Debug('cannon:builder:registry');

export class CannonRegistry {
  provider?: ethers.providers.Provider | null;
  contract?: ethers.Contract | null;
  signer?: ethers.Signer | null;
  url?: string;

  ipfs: IPFSHTTPClient;

  constructor({
    ipfsOptions = {},
    signerOrProvider = null,
    address = null,
  }: {
    ipfsOptions: Options;
    address: string | null;
    signerOrProvider: ethers.Signer | ethers.providers.Provider | null;
  }) {
    if (signerOrProvider) {
      if ((signerOrProvider as ethers.Signer).provider) {
        this.signer = signerOrProvider as ethers.Signer;
        this.provider = this.signer.provider;
      } else {
        this.provider = signerOrProvider as ethers.providers.Provider;
      }

      if (address) {
        this.contract = new ethers.Contract(address, CannonRegistryAbi, this.provider);
      }
    }

    this.url = ipfsOptions.url as string;

    debug(`creating registry with options ${JSON.stringify(ipfsOptions)} on address "${address}"`);

    this.ipfs = create(ipfsOptions);
  }

  async publish(
    name: string,
    version: string,
    tags: string[],
    url: string,
    overrides?: Overrides
  ): Promise<ethers.providers.TransactionReceipt> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Missing signer needed for publishing');
    }

    if ((await this.signer.getBalance()).lte(0)) {
      throw new Error(
        `Signer at address ${await this.signer.getAddress()} is not funded with ETH. Please ensure you have ETH in your wallet in order to publish.`
      );
    }

    const tx = await this.contract.connect(this.signer).publish(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version),
      tags.map((t) => ethers.utils.formatBytes32String(t)),
      url,
      overrides
    );

    return await tx.wait();
  }

  async getUrl(name: string, version: string) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.getPackageUrl(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version)
    );
  }

  async readIpfs(urlOrHash: string): Promise<Buffer> {
    const hash = urlOrHash.replace(/^ipfs:\/\//, '');

    debug(`downloading content from ${this.url}/${hash}`);

    const chunks = [];
    for await (const chunk of this.ipfs.cat(urlOrHash)) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async queryDeploymentInfo(name: string, tag: string) {
    let urlOrHash: string | null;
    if (name == '@ipfs') {
      urlOrHash = tag;
    } else {
      urlOrHash = await this.getUrl(name, tag);
    }

    if (!urlOrHash) {
      return null;
    }

    debug(`downloading deployment info of ${name}:${tag} from ${urlOrHash}`);

    const manifestData = await this.readIpfs(urlOrHash);

    try {
      return JSON.parse(manifestData.toString('utf8')) as DeploymentManifest;
    } catch (err) {
      throw new Error('Received non-json response: ' + manifestData.toString('utf8'));
    }
  }

  async ensureDownloadedManifest(image: string, packagesDir?: string): Promise<DeploymentManifest> {
    const [name, tag] = image.split(':');
    const packageDir = getPackageDir(packagesDir || getSavedPackagesDir(), name, tag);

    const existingManifest = await getAllDeploymentInfos(packageDir);

    if (_.get(existingManifest, 'def.name')) {
      return existingManifest;
    }

    try {
      const manifest = await this.queryDeploymentInfo(name, tag);

      if (!manifest) {
        throw new Error(`package not found: ${name}:${tag}. please check that the requested package exists and try again.`);
      }

      const actualPackageDir = getPackageDir(packagesDir || getSavedPackagesDir(), '@ipfs', await this.getUrl(name, tag));

      await fs.mkdirp(actualPackageDir);

      await fs.writeJson(getDeploymentInfoFile(actualPackageDir), manifest);

      // always download misc files at the same time
      const miscBuf = await this.readIpfs(manifest.misc.ipfsHash);
      const miscZip = new AdmZip(miscBuf);
      await miscZip.extractAllTo(actualPackageDir, true);

      if (name !== manifest.def.name || tag !== manifest.def.version) {
        await associateTag(packagesDir || getSavedPackagesDir(), name, tag, manifest.def.name, manifest.def.version);
      }

      return manifest;
    } catch (err) {
      try {
        // try to delete the mess we created
        await fs.remove(packageDir);
      } catch (_) {
        // do nothing here
      }

      throw err;
    }
  }

  async downloadFullPackage(image: string, packagesDir?: string, checkLatest = false): Promise<DeploymentManifest> {
    const [name, tag] = image.split(':');

    let space: string, hash: string;

    const packageDir = getPackageDir(packagesDir || getSavedPackagesDir(), name, tag);

    if (!name.startsWith('@')) {
      space = '@ipfs';

      if (checkLatest || !fs.existsSync(packageDir)) {
        const url = await this.getUrl(name, tag);

        if (!url) {
          throw new Error(
            `package not found: ${name}:${tag}. please check that the requested package exists and try again.`
          );
        }

        hash = _.last(url.split('/'))!;
      } else {
        hash = _.last((await fs.readlink(packageDir)).split('/'))!;
      }
    } else {
      space = '@ipfs';
      hash = tag;
    }

    if (fs.existsSync(packageDir)) {
      if (!checkLatest || space.startsWith('@') || hash === _.last((await fs.readlink(packageDir)).split('/'))) {
        return await getAllDeploymentInfos(packageDir);
      }
    }

    const manifest = JSON.parse((await this.readIpfs(hash)).toString('utf8')) as DeploymentManifest;

    if (!manifest) {
      throw new Error(`package not found: ${name}:${tag}. please check that the requested package exists and try again.`);
    }

    const actualPackageDir = getPackageDir(packagesDir || getSavedPackagesDir(), space, hash);

    await fs.mkdirp(actualPackageDir);
    await fs.writeJson(getDeploymentInfoFile(actualPackageDir), manifest);

    // always download misc files at the same time
    const miscBuf = await this.readIpfs(manifest.misc.ipfsHash);
    const miscZip = new AdmZip(miscBuf);
    await miscZip.extractAllTo(actualPackageDir, true);

    if (!name.startsWith('@')) {
      await associateTag(packagesDir || getSavedPackagesDir(), space, hash, name, tag);
    }

    for (const chainId in manifest.deploys) {
      for (const preset in manifest.deploys[chainId]) {
        await this.ensureDownloadedPackageChain(image, parseInt(chainId), preset, packagesDir);
      }
    }

    return manifest;
  }

  async ensureDownloadedPackageChain(
    image: string,
    chainId: number,
    preset?: string,
    packagesDir?: string
  ): Promise<DeploymentInfo | null> {
    const [name, tag] = image.split(':');
    const packageDir = getPackageDir(packagesDir || getSavedPackagesDir(), name, tag);

    preset = preset ?? 'main';

    const deploymentDir = path.dirname(getActionFiles(packageDir, chainId, preset, 'sample').basename);

    const manifest = await this.ensureDownloadedManifest(image, packagesDir);

    if (!manifest.deploys[chainId.toString()] || !manifest.deploys[chainId][preset]) {
      // if we have manifest but no chain files, treat it as undeployed build
      return null;
    }

    // only download if deployment not found
    if (!fs.existsSync(deploymentDir)) {
      // whats nice about this is it will import to the actual directory it belongs to so we can link it later
      const buf = await this.readIpfs(manifest.deploys[chainId.toString()][preset].ipfsHash);
      const zip = new AdmZip(buf);

      await zip.extractAllTo(deploymentDir, true);
    }

    return manifest.deploys[chainId.toString()][preset];
  }

  async uploadPackage(image: string, packagesDir?: string) {
    const [name, tag] = image.split(':');

    packagesDir = packagesDir || getSavedPackagesDir();

    const packageDir = getPackageDir(packagesDir, name, tag);

    const manifest = await getAllDeploymentInfos(packageDir);

    if (!manifest) {
      throw new Error('package not found for upload ' + image);
    }

    // start uploading everything
    for (const chainId in manifest.deploys) {
      for (const preset in manifest.deploys[chainId]) {
        const zip = new AdmZip();

        const folder = path.dirname(getActionFiles(packageDir, parseInt(chainId), preset, 'sample').basename);
        await zip.addLocalFolderPromise(folder, {});
        const buf = await zip.toBufferPromise();

        const ipfsInfo = await this.ipfs.add(buf);

        // update IPFS hashes as we go
        manifest.deploys[chainId][preset].ipfsHash = ipfsInfo.cid.toV0().toString();
      }
    }

    // upload the misc artifacts
    const miscZip = new AdmZip();

    // contracts may not be deployed in which case, contracts folder is not created
    if (fs.existsSync(path.join(packageDir, 'contracts'))) {
      await miscZip.addLocalFolderPromise(path.join(packageDir, 'contracts'), { zipPath: 'contracts' });
    }

    const miscIpfsInfo = await this.ipfs.add(await miscZip.toBufferPromise());

    manifest.misc = { ipfsHash: miscIpfsInfo.cid.toV0().toString() };

    // final manifest upload
    return this.ipfs.add(JSON.stringify(manifest));
  }
}

/**
 * sometimes it is nceessary to read from a different type of IPFS API which is read-only. This API can simply fetch individual artifacts by just downloading
 * them directly. To accomodate this, an overridden version of the cannon rgesitry is provided.
 */
export class ReadOnlyCannonRegistry extends CannonRegistry {
  readonly ipfsOptions: ConstructorParameters<typeof CannonRegistry>[0]['ipfsOptions'];

  constructor(opts: ConstructorParameters<typeof CannonRegistry>[0]) {
    super(opts);

    this.ipfsOptions = opts.ipfsOptions;
  }

  async readIpfs(urlOrHash: string): Promise<Buffer> {
    const hash = urlOrHash.replace(/^ipfs:\/\//, '');

    debug(`downloading content from ${this.url}/${hash}`);

    const response = await fetch(`${this.url}/${hash}`);

    return response.buffer();
  }
}
