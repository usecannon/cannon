import { blueBright, bold, yellow } from 'chalk';
import Debug from 'debug';
import EventEmitter from 'promise-events';
import * as viem from 'viem';
import CannonRegistryAbi from './abis/CannonRegistry';
import { PackageReference } from './package';
import { CannonSigner, Contract } from './types';

const debug = Debug('cannon:builder:registry');

export abstract class CannonRegistry {
  abstract publish(packagesNames: string[], chainId: number, url: string, metaUrl: string): Promise<string[]>;

  async publishMany(
    toPublish: { packagesNames: string[]; chainId: number; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    const receipts: string[] = [];
    for (const pub of toPublish) {
      await this.publish(pub.packagesNames, pub.chainId, pub.url, pub.metaUrl);
    }

    return receipts;
  }

  // in general a "catchall" is that if the fullPackageRef is in format "@service:path", then
  // that is a direct service resolve
  // ex @ipfs:Qm... is ipfs://Qm...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUrl(serviceRef: string, chainId: number): Promise<string | null> {
    // Check if its an ipfs hash / url, if so we make sure to remove any incorrectly appended presets (like @main);
    if (serviceRef.startsWith('@')) {
      const result = serviceRef.replace(':', '://').replace('@', '');
      return result.indexOf('@') !== -1 ? result.slice(0, result.indexOf('@')) : result;
    }

    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMetaUrl(serviceRef: string, chainId: number): Promise<string | null> {
    return null;
  }

  // used to clean up unused resources on a loader
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllUrls(filterPackageRef?: string, chainId?: number): Promise<Set<string>> {
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
    return 'memory';
  }

  async publish(packagesNames: string[], chainId: number, url: string, meta?: string): Promise<string[]> {
    const receipts: string[] = [];
    for (const rawName of packagesNames) {
      const { preset, packageRef } = new PackageReference(rawName);
      const variant = `${chainId}-${preset}`;
      debug('in memory publish', preset, packageRef, variant, rawName);

      if (!this.pkgs[packageRef]) {
        this.pkgs[packageRef] = {};
      }
      if (!this.metas[packageRef]) {
        this.metas[packageRef] = {};
      }

      this.pkgs[packageRef][variant] = url;
      if (meta) {
        this.metas[packageRef][variant] = meta;
      }
      receipts.push((++this.count).toString());
    }

    return receipts;
  }

  async getUrl(packageOrServiceRef: string, chainId: number): Promise<string | null> {
    const baseResolved = await super.getUrl(packageOrServiceRef, chainId);
    if (baseResolved) return baseResolved;

    const { preset, packageRef } = new PackageReference(packageOrServiceRef);
    const variant = `${chainId}-${preset}`;

    return this.pkgs[packageRef] ? this.pkgs[packageRef][variant] : null;
  }

  async getMetaUrl(packageOrServiceRef: string, chainId: number): Promise<string | null> {
    const { preset, packageRef } = new PackageReference(packageOrServiceRef);

    const variant = `${chainId}-${preset}`;
    return this.metas[packageRef] ? this.metas[packageRef][variant] : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllUrls(filterPackage?: string, chainId?: number): Promise<Set<string>> {
    return new Set();
  }
}

export class FallbackRegistry extends EventEmitter implements CannonRegistry {
  readonly memoryCacheRegistry: InMemoryRegistry;
  readonly registries: any[];

  constructor(registries: any[]) {
    super();
    this.memoryCacheRegistry = new InMemoryRegistry();
    this.registries = registries;
  }

  getLabel() {
    return `${this.registries.map((r) => r.getLabel()).join(', ')}`;
  }

  async getUrl(packageRef: string, chainId: number): Promise<string | null> {
    const { fullPackageRef } = new PackageReference(packageRef);

    debug('resolving', fullPackageRef, chainId);
    for (const registry of [this.memoryCacheRegistry, ...this.registries]) {
      debug('trying registry', registry.getLabel());
      try {
        const result = await registry.getUrl(packageRef, chainId);

        if (result) {
          debug('fallback registry: loaded from registry', registry.getLabel());
          await this.emit('getPackageUrl', { fullPackageRef, chainId, result, registry, fallbackRegistry: this });
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

  async getMetaUrl(packageOrServiceRef: string, chainId: number): Promise<string | null> {
    const { preset, fullPackageRef } = new PackageReference(packageOrServiceRef);

    for (const registry of this.registries) {
      try {
        const result = await registry.getMetaUrl(fullPackageRef, chainId);

        if (result) {
          await this.emit('getMetaUrl', { fullPackageRef, preset, chainId, result, registry });
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

  async getAllUrls(filterPackageRef?: string, chainId?: number): Promise<Set<string>> {
    const { preset } = new PackageReference(filterPackageRef!);
    const filterVariant = `${chainId}-${preset}`;

    const r = await Promise.all(this.registries.map((r) => r.getAllUrls(filterPackageRef, filterVariant)));

    // apparently converting back to an array is the most efficient way to merge sets
    return new Set(r.flatMap((s) => Array.from(s)));
  }

  async publish(packagesNames: string[], chainId: number, url: string, metaUrl?: string): Promise<string[]> {
    debug('publish to fallback database: ', packagesNames);
    // try to publish to any of the registries
    await this.memoryCacheRegistry.publish(packagesNames, chainId, url, metaUrl);

    // now push to other registries.
    // first one to succeed is fine.
    const errors = [];
    for (const registry of this.registries) {
      try {
        debug('try publish to registry', registry.getLabel());
        return await registry.publish(packagesNames, chainId, url, metaUrl);
      } catch (err: any) {
        debug('error caught in registry while publishing (may be normal):', err);
        errors.push(err);
      }
    }

    throw new Error('no registry succeeded in publishing:\n' + errors.map((e) => e.message).join('\n'));
  }

  async publishMany(
    toPublish: { packagesNames: string[]; chainId: number; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    const receipts: string[] = [];
    for (const pub of toPublish) {
      await this.publish(pub.packagesNames, pub.chainId, pub.url, pub.metaUrl);
    }

    return receipts;
  }
}

export class OnChainRegistry extends CannonRegistry {
  provider?: viem.PublicClient | null;
  signer?: CannonSigner | null;
  contract: Contract;
  overrides: any;

  constructor({
    address,
    signer,
    provider,
    overrides = {},
  }: {
    address: viem.Address;
    signer?: CannonSigner;
    provider?: viem.PublicClient;
    overrides?: any;
  }) {
    super();

    this.signer = signer;
    this.provider = provider;

    this.contract = { address, abi: CannonRegistryAbi as viem.Abi };
    this.overrides = overrides;

    debug(`created registry on address "${address}"`);
  }

  getLabel() {
    return `${this.contract.address}`;
  }

  private async checkSigner() {
    if (!this.signer) {
      throw new Error('Missing signer needed for publishing');
    }

    if (!(await this.provider?.getBalance({ address: this.signer.address }))) {
      throw new Error(
        `Signer at address ${this.signer.address} is not funded with ETH. Please ensure you have ETH in your wallet in order to publish.`
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
    return viem.encodeFunctionData({
      ...this.contract,
      functionName: 'publish',
      args: [
        viem.stringToHex(packagesName, { size: 32 }),
        viem.stringToHex(variant, { size: 32 }),
        packageTags.map((t) => viem.stringToHex(t, { size: 32 })),
        url,
        metaUrl || '',
      ],
    });
  }

  private async doMulticall(datas: string[]): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Missing signer for executing registry operations');
    }

    const tx = await this.provider?.simulateContract({
      ...this.contract,
      functionName: 'multicall',
      args: [datas],
      ...this.overrides,
    });
    // TODO: why does sendTransaction not like output from tx
    const hash = await this.signer?.wallet.sendTransaction(tx.request as any);
    const receipt = await this.provider?.waitForTransactionReceipt({ hash });

    return receipt.transactionHash;
  }

  // TODO: in time remove this
  /* eslint no-console: "off" */

  // this is sort of confusing to have two publish functions that are both used to publish multiple packages
  async publish(packagesNames: string[], chainId: number, url: string, metaUrl?: string): Promise<string[]> {
    await this.checkSigner();
    const datas: string[] = [];

    console.log(bold(blueBright('\nPublishing packages to the registry on-chain...\n')));
    for (const registerPackage of packagesNames) {
      const versions = packagesNames.filter((pkg) => pkg === registerPackage).map((p) => new PackageReference(p).version);

      const ref = new PackageReference(registerPackage);
      const { name, preset } = new PackageReference(registerPackage);
      const variant = `${chainId}-${preset}`;

      console.log(`Package: ${ref.fullPackageRef}`);
      console.log(`Tags: ${versions}`);
      console.log(`Package URL: ${url}`);

      if (!metaUrl) {
        console.log(`Package Metadata URL: ${metaUrl}`);
      }

      console.log('\n');

      const tx = this.generatePublishTransactionData(
        name,
        versions.map((p) => viem.stringToHex(p)),
        variant,
        url,
        metaUrl
      );
      datas.push(tx);
    }
    await this.logMultiCallEstimatedGas(datas);
    return [await this.doMulticall(datas)];
  }

  async publishMany(
    toPublish: { packagesNames: string[]; chainId: number; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    debug('Checking signer');
    await this.checkSigner();
    debug('signer', this.signer);
    const datas: string[] = [];
    console.log(bold(blueBright('\nPublishing packages to the On-Chain registry...\n')));
    for (const pub of toPublish) {
      for (const registerPackage of pub.packagesNames) {
        const versions = pub.packagesNames
          .filter((pkg) => pkg === registerPackage)
          .map((p) => new PackageReference(p).version);

        const { name, preset } = new PackageReference(registerPackage);
        const variant = `${pub.chainId}-${preset}`;

        console.log(`Package: ${name}`);
        console.log(`Tags: ${versions}`);
        console.log(`Package URL: ${pub.url}`);
        pub.metaUrl ? console.log(`Package Metadata URL: ${pub.metaUrl}`) : null;

        console.log('\n-----');

        const tx = this.generatePublishTransactionData(
          name,
          versions.map((p) => viem.stringToHex(p)),
          variant,
          pub.url,
          pub.metaUrl
        );

        datas.push(tx);
      }
    }
    await this.logMultiCallEstimatedGas(datas);
    return [await this.doMulticall(datas)];
  }

  async getUrl(packageOrServiceRef: string, chainId: number): Promise<string | null> {
    if (!this.provider) {
      throw new Error('provider not given to getUrl');
    }

    const baseResolved = await super.getUrl(packageOrServiceRef, chainId);

    if (baseResolved) return baseResolved;

    const { name, version, preset } = new PackageReference(packageOrServiceRef);
    const variant = `${chainId}-${preset}`;

    const url = await this.provider.readContract({
      address: this.contract.address,
      abi: this.contract.abi,
      functionName: 'getPackageUrl',
      args: [
        viem.stringToHex(name, { size: 32 }),
        viem.stringToHex(version, { size: 32 }),
        viem.stringToHex(variant, { size: 32 }),
      ],
    });

    return (url as string) || null;
  }

  async getMetaUrl(packageOrServiceRef: string, chainId: number): Promise<string | null> {
    if (!this.provider) {
      throw new Error('provider not given to getUrl');
    }

    const baseResolved = await super.getUrl(packageOrServiceRef, chainId);
    if (baseResolved) return baseResolved;

    const { name, version, preset } = new PackageReference(packageOrServiceRef);
    const variant = `${chainId}-${preset}`;

    const { result: url } = await this.provider.simulateContract({
      ...this.contract,
      functionName: 'getPackageMeta',
      args: [viem.stringToHex(name), viem.stringToHex(version), viem.stringToHex(variant)],
    });

    return url || null;
  }

  // TODO: viem does not seems to support querying historical logs, even tho its part of a balanced provider diet
  async getAllUrls(/*filterPackageRef?: string, chainId?: number*/): Promise<Set<string>> {
    // TODO: someday
    /*if (!filterPackageRef) {
      // unfortunately it really isnt practical to search for all packages. also the use case is mostly to search for a specific package
      // in the future we might have a way to give the urls to search for and then limit
      return super.getAllUrls(filterPackageRef, chainId);
    }

    const { name, version, preset } = new PackageReference(filterPackageRef!);
    const filterVariant = `${chainId}-${preset}`;

    const filter = this.contract.filters.PackagePublish(
      name ? viem.stringToHex(name) : null,
      version ? viem.stringToHex(version) : null,
      filterVariant ? viem.stringToHex(filterVariant) : null
    );

    const events = await this.contract.queryFilter(filter, 0, 'latest');

    return new Set(events.flatMap((e) => [e.args!.deployUrl, e.args!.metaUrl]));*/
    throw new Error('verifying upstream package urls temporarily not supported');
  }

  private async logMultiCallEstimatedGas(datas: any): Promise<void> {
    if (!this.provider) {
      throw new Error('provider not required for estimating gas');
    }

    try {
      console.log(bold(blueBright('\nCalculating Transaction cost...')));

      const simulatedGas = await this.provider.estimateContractGas({
        address: this.contract.address,
        account: this.signer?.wallet.account,
        abi: this.contract.abi,
        functionName: 'multicall',
        args: [datas],
        ...this.overrides,
      });

      console.log(`\nEstimated gas: ${simulatedGas} wei`);
      const gasPrice = BigInt(this.overrides.maxFeePerGas || this.overrides.gasPrice || (await this.provider.getGasPrice()));
      console.log(`\nGas price: ${viem.formatEther(gasPrice)} ETH`);
      const transactionFeeWei = simulatedGas * gasPrice;
      // Convert the transaction fee from wei to ether
      const transactionFeeEther = viem.formatEther(transactionFeeWei);

      console.log(`\nEstimated transaction Fee: ${transactionFeeEther} ETH\n\n`);

      const userBalance = await this.provider.getBalance({ address: this.signer!.address });

      if (this.signer && userBalance < transactionFeeWei) {
        console.log(
          bold(
            yellow(
              `Publishing address "${this.signer?.address}" does not have enough funds to pay for the publishing transaction, the transaction will likely revert.\n`
            )
          )
        );
      }
    } catch (e: any) {
      console.log(yellow('\n Error in calculating estimated transaction fee for publishing packages: '), e);
    }
  }
}
