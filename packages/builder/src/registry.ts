import { ethers, Overrides } from 'ethers';
import Debug from 'debug';

import CannonRegistryAbi from './abis/CannonRegistry.json';

import _ from 'lodash';

const debug = Debug('cannon:builder:registry');

export class CannonRegistry {
  provider?: ethers.providers.Provider | null;
  contract?: ethers.Contract | null;
  signer?: ethers.Signer | null;

  constructor({
    signerOrProvider = null,
    address = null,
  }: {
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

    debug(`created registry on address "${address}"`);
  }

  async publish(
    name: string,
    version: string,
    tags: string[],
    url: string,
    overrides: Overrides = {}
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
}