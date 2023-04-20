import { ethers, Overrides } from 'ethers';
import Debug from 'debug';
import EventEmitter from 'promise-events';

import CannonRegistryAbi from './abis/CannonRegistry';

import _ from 'lodash';

const debug = Debug('cannon:builder:registry');

export abstract class CannonRegistry {
  abstract publish(packagesNames: string[], variant: string, url: string, metaUrl: string): Promise<string[]>;

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMetaUrl(_packageName: string, _variant: string): Promise<string | null> {
    return null;
  }

  abstract getLabel(): string;
}

/**
 * keeps track of packages in a simple JS object
 * useful for testing and deployment dry-runs
 */
export class InMemoryRegistry extends CannonRegistry {
  readonly pkgs: { [name: string]: { [variant: string]: string } } = {};
  readonly metas: { [name: string]: { [variant: string]: string } } = {};

  count = 0;

  getLabel() {
    return 'in memory';
  }

  async publish(packagesNames: string[], variant: string, url: string, meta: string): Promise<string[]> {
    const receipts: string[] = [];
    for (const name of packagesNames) {
      if (!this.pkgs[name]) {
        this.pkgs[name] = {};
      }
      if (!this.metas[name]) {
        this.metas[name] = {};
      }

      this.pkgs[name][variant] = url;
      this.metas[name][variant] = meta;
      receipts.push((++this.count).toString());
    }

    return receipts;
  }

  async getUrl(packageRef: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageRef, variant);
    if (baseResolved) {
      return baseResolved;
    }

    return this.pkgs[packageRef] ? this.pkgs[packageRef][variant] : null;
  }

  async getMetaUrl(packageRef: string, variant: string): Promise<string | null> {
    return this.metas[packageRef] ? this.metas[packageRef][variant] : null;
  }
}

export class FallbackRegistry extends EventEmitter implements CannonRegistry {
  readonly registries: any[];

  constructor(registries: any[]) {
    super();
    this.registries = registries;
  }

  getLabel() {
    return `fallback (${this.registries.map((r) => r.getLabel()).join(', ')})`;
  }

  async getUrl(packageRef: string, variant: string): Promise<string | null> {
    for (const registry of this.registries) {
      try {
        const result = await registry.getUrl(packageRef, variant);

        if (result) {
          await this.emit('getUrl', { packageRef, variant, result, registry });
          return result;
        }
      } catch (err) {
        debug('WARNING: error caught in registry:', err);
      }
    }

    return null;
  }

  async getMetaUrl(packageRef: string, variant: string): Promise<string | null> {
    for (const registry of this.registries) {
      try {
        const result = await registry.getMetaUrl(packageRef, variant);

        if (result) {
          await this.emit('getMetaUrl', { packageRef, variant, result, registry });
          return result;
        }
      } catch (err) {
        debug('WARNING: error caught in registry:', err);
      }
    }

    return null;
  }

  async publish(packagesNames: string[], variant: string, url: string, metaUrl?: string): Promise<string[]> {
    debug('publish to fallback database: ', packagesNames);
    // the fallback registry is usually something easy to write to or get to later
    return _.first(this.registries).publish(packagesNames, variant, url, metaUrl);
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
    signerOrProvider: string | ethers.Signer | ethers.providers.Provider;
    overrides?: Overrides;
  }) {
    super();

    if (typeof signerOrProvider === 'string') {
      this.provider = new ethers.providers.JsonRpcProvider(signerOrProvider);
    } else if ((signerOrProvider as ethers.Signer).provider) {
      this.signer = signerOrProvider as ethers.Signer;
      this.provider = this.signer.provider;
    } else {
      this.provider = signerOrProvider as ethers.providers.Provider;
    }

    this.contract = new ethers.Contract(address, CannonRegistryAbi, this.provider);
    this.overrides = overrides;

    debug(`created registry on address "${address}"`);
  }

  getLabel() {
    return `on chain ${this.contract.address}`;
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

    if (baseResolved) return baseResolved;

    const [name, version] = packageName.split(':');

    const url = await this.contract.getPackageUrl(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version),
      ethers.utils.formatBytes32String(variant)
    );

    return url === '' ? null : url;
  }

  async getMetaUrl(packageName: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageName, variant);

    if (baseResolved) return baseResolved;

    const [name, version] = packageName.split(':');

    const url = await this.contract.getPackageMeta(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version),
      ethers.utils.formatBytes32String(variant)
    );

    return url === '' ? null : url;
  }
}
