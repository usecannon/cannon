import { ethers, Overrides } from 'ethers';
import Debug from 'debug';

import CannonRegistryAbi from './abis/CannonRegistry';

import _ from 'lodash';

const debug = Debug('cannon:builder:registry');

export abstract class CannonRegistry {
  abstract publish(packagesNames: string[], url: string, variant: string): Promise<string[]>;

  // in general a "catchall" is that if the packageName is in format "@service:path", then
  // that is a direct service resolve
  // ex @ipfs:Qm... is ipfs://Qm...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUrl(packageName: string, _variant: string): Promise<string | null> {
    if (packageName.startsWith('@')) {
      return packageName.replace(':', '://').replace('@', '');
    }

    return null;
  }
}

export class OnChainRegistry extends CannonRegistry {
  provider?: ethers.providers.Provider | null;
  signer?: ethers.Signer | null;
  contract: ethers.Contract;
  overrides: ethers.Overrides;

  constructor({
    signerOrProvider,
    address,
    overrides = {},
  }: {
    address: string;
    signerOrProvider: ethers.Signer | ethers.providers.Provider;
    overrides?: Overrides;
  }) {
    super();
    if ((signerOrProvider as ethers.Signer).provider) {
      this.signer = signerOrProvider as ethers.Signer;
      this.provider = this.signer.provider;
    } else {
      this.provider = signerOrProvider as ethers.providers.Provider;
    }

    this.contract = new ethers.Contract(address, CannonRegistryAbi, this.provider);
    this.overrides = overrides;

    debug(`created registry on address "${address}"`);
  }

  async publish(packagesNames: string[], variant: string, url: string, metaUrl?: string): Promise<string[]> {
    if (!this.signer) {
      throw new Error('Missing signer needed for publishing');
    }

    if ((await this.signer.getBalance()).lte(0)) {
      throw new Error(
        `Signer at address ${await this.signer.getAddress()} is not funded with ETH. Please ensure you have ETH in your wallet in order to publish.`
      );
    }

    const txns: ethers.providers.TransactionReceipt[] = [];
    for (const registerPackages of _.values(
      _.groupBy(
        packagesNames.map((n) => n.split(':')),
        (p: string[]) => p[0]
      )
    )) {
      const tx = await this.contract.connect(this.signer).publish(
        ethers.utils.formatBytes32String(registerPackages[0][0]),
        ethers.utils.formatBytes32String(variant),
        registerPackages.map((p) => ethers.utils.formatBytes32String(p[1])),
        url,
        metaUrl || '',
        this.overrides
      );

      txns.push(await tx.wait());
    }

    return txns.map((t) => t.transactionHash);
  }

  async getUrl(packageName: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageName, variant);
    if (baseResolved) {
      return baseResolved;
    }

    const [name, version] = packageName.split(':');

    const url = await this.contract.getPackageUrl(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version),
      ethers.utils.formatBytes32String(variant)
    );

    return url === '' ? null : url;
  }
}
