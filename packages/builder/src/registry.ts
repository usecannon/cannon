import { BigNumber, ethers, CallOverrides } from 'ethers';
import Debug from 'debug';
import EventEmitter from 'promise-events';

import CannonRegistryAbi from './abis/CannonRegistry';

import _ from 'lodash';

import { bold, blueBright, yellow } from 'chalk';
import { handleTxnError } from './error';

const debug = Debug('cannon:builder:registry');

export abstract class CannonRegistry {
  abstract publish(packagesNames: string[], variant: string, url: string, metaUrl: string): Promise<string[]>;

  async publishMany(
    toPublish: { packagesNames: string[]; variant: string; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    const receipts: string[] = [];
    for (const pub of toPublish) {
      await this.publish(pub.packagesNames, pub.variant, pub.url, pub.metaUrl);
    }

    return receipts;
  }

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

  // used to clean up unused resources on a loader
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllUrls(_filterPackage?: string, _filterVariant?: string): Promise<Set<string>> {
    return new Set();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllUrls(_filterPackage?: string, _filterVariant?: string): Promise<Set<string>> {
    return new Set();
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
          debug('fallback registry: loaded from registry', registry.getLabel());
          await this.emit('getUrl', { packageRef, variant, result, registry, fallbackRegistry: this });
          return result;
        }
      } catch (err: any) {
        debug('WARNING: error caught in registry:', err);
        if (err.error && err.error.data === '0x') {
          throw new Error(
            'JSON-RPC Error: This is likely an error on the RPC provider being used, ' +
              `you can verify this if you have access to the node logs. \n\n ${err} \n ${err.error}`
          );
        }
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
      } catch (err: any) {
        debug('WARNING: error caught in registry:', err);
        if (err.error && err.error.data === '0x') {
          throw new Error(
            'JSON-RPC Error: This is likely an error on the RPC provider being used, ' +
              `you can verify this if you have access to the node logs. \n\n ${err} \n ${err.error}`
          );
        }
      }
    }

    return null;
  }

  async getAllUrls(filterPackage?: string, filterVariant?: string): Promise<Set<string>> {
    const r = await Promise.all(this.registries.map((r) => r.getAllUrls(filterPackage, filterVariant)));

    // apparently converting back to an array is the most efficient way to merge sets
    return new Set(r.flatMap((s) => Array.from(s)));
  }

  async publish(packagesNames: string[], variant: string, url: string, metaUrl?: string): Promise<string[]> {
    debug('publish to fallback database: ', packagesNames);
    // try to publish to any of the registries
    // first one to succeed
    const errors = [];
    for (const registry of this.registries) {
      try {
        return await registry.publish(packagesNames, variant, url, metaUrl);
      } catch (err: any) {
        debug('error caught in registry while publishing (may be normal):', err);
        errors.push(err);
      }
    }

    throw new Error('no registry succeeded in publishing:\n' + errors.map((e) => e.message).join('\n'));
  }

  async publishMany(
    toPublish: { packagesNames: string[]; variant: string; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    const receipts: string[] = [];
    for (const pub of toPublish) {
      await this.publish(pub.packagesNames, pub.variant, pub.url, pub.metaUrl);
    }

    return receipts;
  }
}

export class OnChainRegistry extends CannonRegistry {
  provider?: ethers.providers.Provider | null;
  signer?: ethers.Signer | null;
  contract: ethers.Contract;
  overrides: ethers.CallOverrides;

  constructor({
    signerOrProvider,
    address,
    overrides = {},
  }: {
    address: string;
    signerOrProvider: string | ethers.Signer | ethers.providers.Provider;
    overrides?: CallOverrides;
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

  private async checkSigner() {
    if (!this.signer) {
      throw new Error('Missing signer needed for publishing');
    }

    if ((await this.signer.getBalance()).lte(0)) {
      throw new Error(
        `Signer at address ${await this.signer.getAddress()} is not funded with ETH. Please ensure you have ETH in your wallet in order to publish.`
      );
    }
  }

  private generatePublishTransactionData(
    packagesName: string,
    packageTags: string[],
    variant: string,
    url: string,
    metaUrl?: string
  ) {
    return this.contract.interface.encodeFunctionData('publish', [
      ethers.utils.formatBytes32String(packagesName),
      ethers.utils.formatBytes32String(variant),
      packageTags,
      url,
      metaUrl || '',
    ]);
  }

  private async doMulticall(datas: string[]): Promise<string> {
    const tx = await this.contract.connect(this.signer!).multicall(datas, this.overrides);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  // this is sort of confusing to have two publish functions that are both used to publish multiple packages
  async publish(packagesNames: string[], variant: string, url: string, metaUrl?: string): Promise<string[]> {
    await this.checkSigner();
    const datas: string[] = [];
    
    console.log(bold(blueBright('\nPublishing packages to the On-Chain registry...\n')));
    for (const registerPackages of _.values(
      _.groupBy(
        packagesNames.map((n) => n.split(':')),
        (p: string[]) => p[0]
      )
    )) {
      console.log(`Package: ${registerPackages[0][0]}`);
      console.log(
        `Tags: [${registerPackages.map((v, i) => {
          return `${registerPackages[i][1]}`;
        })}]`
      );
      console.log(`Package URL: ${url}`);
      !metaUrl ? null : console.log(`Package Metadata URL: ${metaUrl}`);

      const tx = this.generatePublishTransactionData(
        registerPackages[0][0],
        registerPackages.map((p) => ethers.utils.formatBytes32String(p[1])),
        variant,
        url,
        metaUrl
      );
      datas.push(tx);
    }
    await this.logMultiCallEstimatedGas(datas, this.overrides);
    return [await this.doMulticall(datas)];
  }

  async publishMany(
    toPublish: { packagesNames: string[]; variant: string; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    debug('Checking signer');
    await this.checkSigner();
    debug('signer', this.signer);
    const datas: string[] = [];
    console.log(bold(blueBright('\nPublishing packages to the On-Chain registry...\n')));
    for (const pub of toPublish) {
      for (const registerPackages of _.values(
        _.groupBy(
          pub.packagesNames.map((n) => n.split(':')),
          (p: string[]) => p[0]
        )
      )) {

        console.log(`Package: ${pub.packagesNames[0]}`);
        console.log(`Package URL: ${pub.url}`);
        console.log(
          `Tags: [${registerPackages.map((v, i) => {
            return `${registerPackages[i][1]}`;
          })}]`
        );
        pub.metaUrl ? console.log(`Package Metadata URL: ${pub.metaUrl}`) : null;
  
        console.log('\n-----');

        const tx = this.generatePublishTransactionData(
          registerPackages[0][0],
          registerPackages.map((p) => ethers.utils.formatBytes32String(p[1])),
          pub.variant,
          pub.url,
          pub.metaUrl
        );

        datas.push(tx);
      }
    }
    await this.logMultiCallEstimatedGas(datas, this.overrides);
    return [await this.doMulticall(datas)];
  }

  async getUrl(packageName: string, variant: string): Promise<string | null> {
    const baseResolved = await super.getUrl(packageName, variant);

    if (baseResolved) return baseResolved;

    const [name, version = 'latest'] = packageName.split(':');

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

    const [name, version = 'latest'] = packageName.split(':');

    const url = await this.contract.getPackageMeta(
      ethers.utils.formatBytes32String(name),
      ethers.utils.formatBytes32String(version),
      ethers.utils.formatBytes32String(variant)
    );

    return url === '' ? null : url;
  }

  async getAllUrls(filterPackage?: string, filterVariant?: string): Promise<Set<string>> {
    if (!filterPackage) {
      // unfortunately it really isnt practical to search for all packages. also the use case is mostly to search for a specific package
      // in the future we might have a way to give the urls to search for and then limit
      return new Set();
    }

    const [name, version] = filterPackage.split(':');

    const filter = this.contract.filters.PackagePublish(
      name ? ethers.utils.formatBytes32String(name) : null,
      version ? ethers.utils.formatBytes32String(version) : null,
      filterVariant ? ethers.utils.formatBytes32String(filterVariant) : null
    );

    const events = await this.contract.queryFilter(filter, 0, 'latest');

    return new Set(events.flatMap((e) => [e.args!.deployUrl, e.args!.metaUrl]));
  }

  private async logMultiCallEstimatedGas(datas: any, overrides: CallOverrides): Promise<void> {
    try {
      console.log(bold(blueBright('\nCalculating Transaction cost...')));
      const estimatedGas = await this.contract.estimateGas.multicall(datas, overrides);
      console.log(`\nEstimated gas: ${estimatedGas}`);
      const gasPrice =
        (overrides.maxFeePerGas as BigNumber) || (overrides.gasPrice as BigNumber) || (await this.provider?.getGasPrice());
      console.log(`\nGas price: ${ethers.utils.formatEther(gasPrice)} ETH`);
      const transactionFeeWei = estimatedGas.mul(gasPrice);
      // Convert the transaction fee from wei to ether
      const transactionFeeEther = ethers.utils.formatEther(transactionFeeWei);

      console.log(`\nEstimated transaction Fee: ${transactionFeeEther} ETH\n\n`);

      if ((await this.signer?.getBalance())?.lte(transactionFeeWei)) {
        console.log(
          bold(
            '\nPublishing account does not have enough funds to pay for the publishing transaction, please fund your account and try again.\n'
          )
        );
      }
    } catch (e: any) {
      // We dont want to throw an error if the estimate gas fails
      console.log(yellow('\n Error in calculating estimated transaction fee for publishing packages: '), e);
    }
  }
}
