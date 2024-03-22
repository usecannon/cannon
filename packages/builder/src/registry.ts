/* eslint-disable no-console */

import { blueBright, bold, yellow } from 'chalk';
import Debug from 'debug';
import _ from 'lodash';
import EventEmitter from 'promise-events';
import * as viem from 'viem';
import CannonRegistryAbi from './abis/CannonRegistry';
import { prepareMulticall } from './multicall';
import { PackageReference } from './package';
import { CannonSigner } from './types';

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
    const r = await Promise.all(this.registries.map((r) => r.getAllUrls(filterPackageRef, chainId)));

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

interface PackageData {
  name: string;
  tags: string[];
  variant: string;
  url: string;
  metaUrl?: string;
}

export class OnChainRegistry extends CannonRegistry {
  provider?: viem.PublicClient | null;
  signer?: CannonSigner | null;
  contract: { address: viem.Address; abi: typeof CannonRegistryAbi };
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

    this.contract = { address, abi: CannonRegistryAbi };
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

  private async checkPackageOwnership(packageName: string) {
    if (!this.signer || !this.provider) {
      throw new Error('Missing signer for executing registry operations');
    }

    const packageHash = viem.stringToHex(packageName, { size: 32 });

    const packageOwner: viem.Address = await this.provider.readContract({
      ...this.contract,
      functionName: 'getPackageOwner',
      args: [packageHash],
    });

    const signer = viem.getAddress(this.signer.address);

    if (viem.isAddressEqual(packageOwner, viem.zeroAddress)) return;
    if (viem.isAddressEqual(signer, packageOwner)) return;

    const additionalDeployers: viem.Address[] = await this.provider?.readContract({
      ...this.contract,
      functionName: 'getAdditionalPublishers',
      args: [packageHash],
    });

    if (!additionalDeployers.some((deployer) => viem.isAddressEqual(signer, deployer))) {
      throw new Error(`Signer "${signer}" does not have publishing permissions on the "${packageName}" package`);
    }
  }

  private async _publishPackages(packages: PackageData[]): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Missing signer for executing registry operations');
    }

    const txs = packages.map((data) => ({
      abi: this.contract.abi,
      address: this.contract.address,
      functionName: 'publish',
      value: BigInt(0),
      args: [
        viem.stringToHex(data.name, { size: 32 }),
        viem.stringToHex(data.variant, { size: 32 }),
        data.tags.map((t) => viem.stringToHex(t, { size: 32 })),
        data.url,
        data.metaUrl || '',
      ],
    }));

    const txData = txs.length === 1 ? txs[0] : prepareMulticall(txs);

    const simulatedGas = await this.provider.estimateContractGas({
      ...txData,
      account: this.signer.wallet.account || this.signer.address,
      ...this.overrides,
    });

    await this.logEstimatedGas(simulatedGas);

    const tx = await this.provider.simulateContract({
      ...txData,
      account: this.signer.wallet.account || this.signer.address,
      ...this.overrides,
    });

    const hash = await this.signer.wallet.writeContract(tx.request as any);
    const receipt = await this.provider.waitForTransactionReceipt({ hash });

    return receipt.transactionHash;
  }

  // this is sort of confusing to have two publish functions that are both used to publish multiple packages
  async publish(packagesNames: string[], chainId: number, url: string, metaUrl?: string): Promise<string[]> {
    await this.checkSigner();
    const datas: PackageData[] = [];

    console.log(bold(blueBright('\nPublishing packages to the registry on-chain...\n')));
    for (const registerPackage of packagesNames) {
      const tags = packagesNames.filter((pkg) => pkg === registerPackage).map((p) => new PackageReference(p).version);

      const { name, preset, fullPackageRef } = new PackageReference(registerPackage);

      await this.checkPackageOwnership(name);
      const variant = `${chainId}-${preset}`;

      console.log(`Package: ${fullPackageRef}`);
      console.log(`Tags: ${tags}`);
      console.log(`Package URL: ${url}`);

      if (metaUrl) {
        console.log(`Package Metadata URL: ${metaUrl}`);
      }

      console.log('\n');

      const existant = datas.find((data) => _.isMatch(data, { name, variant, url, metaUrl }));

      if (existant) {
        existant.tags = _.union(existant.tags, tags);
      } else {
        datas.push({ name, tags, variant, url, metaUrl });
      }
    }

    return [await this._publishPackages(datas)];
  }

  async publishMany(
    toPublish: { packagesNames: string[]; chainId: number; url: string; metaUrl: string }[]
  ): Promise<string[]> {
    await this.checkSigner();
    debug('signer', this.signer);
    const datas: PackageData[] = [];

    console.log(bold(blueBright('\nPublishing packages to the On-Chain registry...\n')));
    for (const pub of toPublish) {
      const { url, metaUrl } = pub;
      for (const registerPackage of pub.packagesNames) {
        const tags = pub.packagesNames.filter((pkg) => pkg === registerPackage).map((p) => new PackageReference(p).version);

        const { name, preset } = new PackageReference(registerPackage);

        await this.checkPackageOwnership(name);
        const variant = `${pub.chainId}-${preset}`;

        console.log(`Package: ${name}`);
        console.log(`Tags: ${tags}`);
        console.log(`Package URL: ${url}`);

        if (metaUrl) {
          console.log(`Package Metadata URL: ${metaUrl}`);
        }

        console.log('\n-----');

        const existant = datas.find((data) => _.isMatch(data, { name, variant, url, metaUrl }));

        if (existant) {
          existant.tags = _.union(existant.tags, tags);
        } else {
          datas.push({ name, tags, variant, url, metaUrl });
        }
      }
    }

    return [await this._publishPackages(datas)];
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
      args: [
        viem.stringToHex(name, { size: 32 }),
        viem.stringToHex(version, { size: 32 }),
        viem.stringToHex(variant, { size: 32 }),
      ],
    });

    return url || null;
  }

  async getAllUrls(filterPackageRef?: string, chainId?: number): Promise<Set<string>> {
    if (!this.provider) {
      throw new Error('no provider');
    }

    let filterName = null;
    let filterVersion = null;
    let filterVariant = null;
    if (filterPackageRef) {
      const { name, version, preset } = new PackageReference(filterPackageRef!);
      const variant = `${chainId}-${preset}`;
      filterName = name ? viem.stringToHex(name) : null;
      filterVersion = version ? viem.stringToHex(version) : null;
      filterVariant = variant ? viem.stringToHex(variant) : null;
    }

    const curBlock = Number(await this.provider!.getBlockNumber());
    // most of these apis max their results at 10000
    // currently we dont see so many publishes to go over 10000 easily in a single request, but to make sure
    // we also check that the returned request items is not equal to 10000 exactly (otherwise something probably borked up)
    const BLOCK_SCAN_BATCH = filterName ? 1e10 : 50000;
    const rawEvents: viem.Log[] = [];
    for (let i = 16490000; i < curBlock; i += BLOCK_SCAN_BATCH) {
      debug(`scan events for getAllUrls ${i} -- ${i + BLOCK_SCAN_BATCH}`);
      rawEvents.push(
        ...(await this.provider!.getLogs({
          address: this.contract.address,
          event: viem.getAbiItem({ abi: this.contract.abi, name: 'PackagePublish' }) as any,
          args: [filterName, filterVersion, filterVariant],
          fromBlock: BigInt(i),
          toBlock: BigInt(Math.min(curBlock, i + BLOCK_SCAN_BATCH)),
        }))
      );
    }

    debug(`received ${rawEvents.length} package publish events`);
    const decodedEvents = viem.parseEventLogs({
      logs: rawEvents,
      eventName: 'PackagePublish',
      abi: this.contract.abi,
    });

    return new Set(decodedEvents.flatMap((e) => [(e.args as any).deployUrl, (e.args as any).metaUrl]));
  }

  private async logEstimatedGas(simulatedGas: bigint): Promise<void> {
    if (!this.signer || !this.provider) {
      throw new Error('Missing signer for executing registry operations');
    }

    console.log(`\nEstimated gas: ${simulatedGas} wei`);

    const gasPrice = BigInt(this.overrides.maxFeePerGas || this.overrides.gasPrice || (await this.provider.getGasPrice()));
    console.log(`\nGas price: ${viem.formatEther(gasPrice)} ETH`);
    const transactionFeeWei = simulatedGas * gasPrice;
    console.log(`\nEstimated transaction Fee: ${viem.formatEther(transactionFeeWei)} ETH\n\n`);

    const userBalance = await this.provider.getBalance({ address: this.signer.address });
    if (this.signer && userBalance < transactionFeeWei) {
      console.log(
        bold(
          yellow(
            `Publishing address "${this.signer.address}" does not have enough funds to pay for the publishing transaction, the transaction will likely revert.\n`
          )
        )
      );
    }
  }
}
