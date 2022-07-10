import path from 'path';
import { ethers } from 'ethers';

import { associateTag } from './storage';
import fs from 'fs-extra';

import { Readable } from 'stream';
import { getAllDeploymentInfos, getChartDir, getDeploymentInfoFile, getActionFiles, getSavedChartsDir } from '.';

import { IPFSHTTPClient, create, Options } from 'ipfs-http-client';
import { DeploymentInfo, DeploymentManifest } from './types';
import AdmZip from 'adm-zip';

import CannonRegistryAbi from './abis/CannonRegistry.json';

export class CannonRegistry {
  provider?: ethers.providers.Provider;
  contract?: ethers.Contract;
  signer?: ethers.Signer;

  ipfs: IPFSHTTPClient;

  constructor({
    address,
    ipfsOptions = {},
    signerOrProvider,
  }: {
    address: string;
    ipfsOptions: Options;
    signerOrProvider: ethers.Signer | ethers.providers.Provider;
  }) {
    if ((signerOrProvider as ethers.Signer).provider) {
      this.signer = signerOrProvider as ethers.Signer;
      this.provider = this.signer.provider;
    } else {
      this.provider = signerOrProvider as ethers.providers.Provider;
    }

    this.contract = new ethers.Contract(address, CannonRegistryAbi, this.provider);

    this.ipfs = create(ipfsOptions);
  }

  async publish(name: string, version: string, tags: string[], url: string): Promise<ethers.providers.TransactionReceipt> {
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
      url
    );

    return await tx.wait();
  }

  async getUrl(name: string, version: string) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.getPackageUrl(ethers.utils.formatBytes32String(name), ethers.utils.formatBytes32String(version));
  }

  readIpfs(urlOrHash: string): Promise<Buffer> {
    const hash = urlOrHash.replace(/^ipfs:\/\//, '');

    return new Promise((resolve, reject) => {
      const bufs: Buffer[] = [];

      const readable = Readable.from(this.ipfs.get(hash));

      readable.on('data', (b) => bufs.push(b));
      readable.on('end', () => resolve(Buffer.concat(bufs)));
      readable.on('error', reject);
    });
  }

  async queryDeploymentInfo(name: string, tag: string) {
    const url = await this.getUrl(name, tag);

    if (!url) {
      return null;
    }

    const manifestData = await this.readIpfs(url);

    return JSON.parse(manifestData.toString('utf8')) as DeploymentManifest;
  }

  async downloadPackageChain(
    image: string,
    chainId: number,
    preset?: string,
    chartsDir?: string
  ): Promise<DeploymentInfo | null> {
    const [name, tag] = image.split(':');

    preset = preset ?? 'main';

    const manifest = await this.queryDeploymentInfo(name, tag);

    if (!manifest) {
      throw new Error(`package not found: ${name}:${tag}. please check that the requested package exists and try again.`);
    }

    const chartDir = getChartDir(chartsDir || getSavedChartsDir(), manifest.def.name, manifest.def.version);

    await fs.mkdirp(chartDir);
    await fs.writeJson(getDeploymentInfoFile(chartDir), manifest);

    if (!manifest.deploys[chainId.toString()] || !manifest.deploys[chainId][preset]) {
      // if we have manifest but no chain files, treat it as undeployed build
      return null;
    }

    // whats nice about this is it will import to the actual directory it belongs to so we can link it later
    const buf = await this.readIpfs(manifest.deploys[chainId.toString()][preset].ipfsHash);
    const zip = new AdmZip(buf);

    const dir = path.dirname(getActionFiles(chartDir, chainId, preset, 'sample').basename);
    await zip.extractAllTo(dir, true);

    const miscBuf = await this.readIpfs(manifest.misc.ipfsHash);
    const miscZip = new AdmZip(miscBuf);
    await miscZip.extractAllTo(chartDir, true);

    // imported chain may be of a different version from the actual requested tag. Make sure we link if necessary
    await associateTag(chartsDir || getSavedChartsDir(), manifest.def.name, manifest.def.version, tag);

    return manifest.deploys[chainId.toString()][preset];
  }

  async uploadPackage(image: string, tags?: string[], chartsDir?: string): Promise<ethers.providers.TransactionReceipt> {
    const [name, tag] = image.split(':');

    chartsDir = chartsDir || getSavedChartsDir();

    const chartDir = getChartDir(chartsDir, name, tag);

    const manifest = await getAllDeploymentInfos(chartDir);

    if (!manifest) {
      throw new Error('chart not found for upload ' + image);
    }

    // start uploading everything
    for (const chainId in manifest.deploys) {
      for (const preset in manifest.deploys[chainId]) {
        const zip = new AdmZip();

        const folder = path.dirname(getActionFiles(chartDir, parseInt(chainId), preset, 'sample').basename);
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
    if (fs.existsSync(path.join(chartDir, 'contracts'))) {
      await miscZip.addLocalFolderPromise(path.join(chartDir, 'contracts'), { zipPath: 'contracts' });
    }

    const miscIpfsInfo = await this.ipfs.add(await miscZip.toBufferPromise());

    manifest.misc = { ipfsHash: miscIpfsInfo.cid.toV0().toString() };

    // final manifest upload
    const manifestIpfsInfo = await this.ipfs.add(JSON.stringify(manifest));

    return await this.publish(
      name,
      manifest.def.version,
      tags || ['latest'],
      'ipfs://' + manifestIpfsInfo.cid.toV0().toString()
    );
  }
}
