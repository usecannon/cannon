import path from 'path';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';

export default class CannonRegistry {
  provider?: ethers.providers.JsonRpcProvider;
  contract?: ethers.Contract;
  wallet?: ethers.Wallet;
  abi: any[];

  constructor({
    endpoint,
    address,
    privateKey,
  }: {
    endpoint: string;
    address: string;
    privateKey?: string;
  }) {
    this.abi = JSON.parse(
      readFileSync(
        path.resolve(__dirname, '..', 'abis', 'CannonRegistry.json')
      ).toString()
    );

    this.provider = new ethers.providers.JsonRpcProvider(endpoint);
    this.contract = new ethers.Contract(address, this.abi, this.provider);

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  async publish(name: string, version: string, url: string) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.wallet) {
      throw new Error('Missing cannon.publisherPrivateKey configuration');
    }

    const tx = await this.contract
      .connect(this.wallet)
      .publish(
        ethers.utils.formatBytes32String(name),
        ethers.utils.formatBytes32String(version),
        url
      );

    return await tx.wait();
  }

  async getUrl(name: string, version: string) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.getUrl(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version)
    );
  }
}
