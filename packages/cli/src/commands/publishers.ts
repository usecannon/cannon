import { OnChainRegistry, PackageReference, DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';
import _ from 'lodash';
import Debug from 'debug';
import * as viem from 'viem';
import prompts from 'prompts';
import { log } from '../util/console';
import { blueBright, gray, green, bold } from 'chalk';

import { CliSettings } from '../settings';
import { resolveProviderAndSigners, ProviderAction } from '../util/provider';
import { waitForEvent } from '../util/wait-for-event';

const debug = Debug('cannon:cli:publishers');

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
}

enum Network {
  OP = 'OP',
  MAINNET = 'ETH',
}

export async function publishers({ cliSettings, options, packageRef }: Params) {
  // throw an error if the user has not provided any option
  if (!options.add && !options.remove && !options.list) {
    throw new Error('Please provide either --add, --remove or --list option');
  }

  // --list should be used alone
  if (options.list && (options.add || options.remove)) {
    throw new Error('Cannot use --list option with --add or --remove');
  }

  if (cliSettings.isE2E) {
    // anvil optimism fork
    cliSettings.registries[0].rpcUrl = ['http://127.0.0.1:9546'];
    // anvil mainnet fork
    cliSettings.registries[1].rpcUrl = ['http://127.0.0.1:9545'];
  }

  debug('Registries list: ', cliSettings.registries);

  const publishersToAdd: viem.Address[] = options.add
    ? options.add.split(',').map((p: string) => viem.getAddress(p.trim()))
    : undefined;

  const publishersToRemove: viem.Address[] = options.remove
    ? options.remove.split(',').map((p: string) => viem.getAddress(p.trim()))
    : undefined;

  // throw an error if the user has provided invalid addresses
  if (publishersToAdd && !publishersToAdd.every((p) => viem.isAddress(p))) {
    throw new Error('Invalid address provided for --add option');
  }
  if (publishersToRemove && !publishersToRemove.every((p) => viem.isAddress(p))) {
    throw new Error('Invalid address provided for --remove option');
  }

  // Check if both options provided and addresses are the repeated
  if (
    publishersToAdd &&
    publishersToRemove &&
    publishersToAdd.some((p) => publishersToRemove.some((p1) => viem.isAddressEqual(p, p1)))
  ) {
    throw new Error('Cannot add and remove the same address in one operation');
  }

  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (!isDefaultSettings) throw new Error('Only default registries are supported for now');

  let selectedNetwork = options.optimism ? Network.OP : Network.MAINNET;

  if (!options.optimism && !options.mainnet && !options.list) {
    selectedNetwork = (
      await prompts({
        type: 'select',
        name: 'value',
        message: 'Where do you want to add or remove publishers?',
        choices: [
          { title: 'Optimism', value: Network.OP },
          { title: 'Ethereum Mainnet', value: Network.MAINNET },
        ],
        initial: 0,
      })
    ).value;

    log();
  }

  const isMainnet = selectedNetwork === Network.MAINNET;
  const [readRegistry, writeRegistry] = cliSettings.registries;

  log(bold(`Resolving connection to ${writeRegistry.name} (Chain ID: ${writeRegistry.chainId})...`));

  const registryProviders = await Promise.all([
    resolveProviderAndSigners({
      chainId: readRegistry.chainId!,
      checkProviders: readRegistry.providerUrl,
      action: ProviderAction.ReadProvider,
    }),
    resolveProviderAndSigners({
      chainId: writeRegistry.chainId!,
      privateKey: cliSettings.privateKey!,
      checkProviders: writeRegistry.providerUrl,
      action: options.list ? ProviderAction.ReadProvider : ProviderAction.WriteProvider,
    }),
  ]);

  const [optimismRegistryConfig, mainnetRegistryConfig] = cliSettings.registries;
  const [optimismRegistryProvider, mainnetRegistryProvider] = registryProviders;

  const overrides: any = {};
  if (options.maxFeePerGas) {
    overrides.maxFeePerGas = viem.parseGwei(options.maxFeePerGas);
  }

  if (options.gasLimit) {
    overrides.gasLimit = options.gasLimit;
  }

  if (options.value) {
    overrides.value = options.value;
  }

  const mainnetRegistry = new OnChainRegistry({
    signer: mainnetRegistryProvider.signers[0],
    provider: mainnetRegistryProvider.provider,
    address: mainnetRegistryConfig.address,
    overrides,
  });

  const optimismRegistry = new OnChainRegistry({
    signer: optimismRegistryProvider.signers[0],
    provider: optimismRegistryProvider.provider,
    address: optimismRegistryConfig.address,
    overrides,
  });

  const userAddress = !options.list ? mainnetRegistryProvider.signers[0].address : viem.zeroAddress;

  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await mainnetRegistry.getPackageOwner(packageName);

  // throw an error if the package is not registered
  if (viem.isAddressEqual(packageOwner, viem.zeroAddress)) {
    throw new Error('The package is not registered already.');
  }
  // throw an error if the package is not registered by the user address
  if (!options.list && !viem.isAddressEqual(packageOwner, userAddress)) {
    throw new Error(`Unauthorized: The package "${packageName}" is already registered by "${packageOwner}".`);
  }

  const [mainnetCurrentPublishers, optimismCurrentPublishers] = await Promise.all([
    mainnetRegistry.getAdditionalPublishers(packageName),
    optimismRegistry.getAdditionalPublishers(packageName),
  ]);

  if (options.list) {
    log('');
    log(`The ${packageName} package lists the following publishers: `);
    log(`  - ${packageOwner} (Mainnet) (Package Owner)`);
    mainnetCurrentPublishers.forEach((p) => log(`  - ${p} (Mainnet)`));
    optimismCurrentPublishers.forEach((p) => log(`  - ${p} (Optimism)`));
    log('');

    return;
  }

  const currentPublishers = isMainnet ? mainnetCurrentPublishers : optimismCurrentPublishers;

  // copy the current publishers
  let publishers = [...currentPublishers];

  // remove publisher if specified
  if (publishersToRemove) {
    publishers = publishers.filter((p) => !publishersToRemove.some((toRemove) => viem.isAddressEqual(p, toRemove)));
  }

  // add new publisher if specified
  if (publishersToAdd) {
    publishersToAdd.forEach((p) => {
      if (!publishers.some((p1) => viem.isAddressEqual(p, p1))) {
        publishers.push(p);
      }
    });
  }

  // throw an error if the publishers list is already up to date
  if (_.isEqual(currentPublishers, publishers)) {
    throw new Error('The publishers list is already up to date.');
  }

  log();
  log('The publishers list will be updated as follows:');
  publishers.forEach((publisher) => log(` - ${publisher} (${isMainnet ? 'Ethereum Mainnet' : 'OP Mainnet'})`));
  const restOfPublishers = !isMainnet ? mainnetCurrentPublishers : optimismCurrentPublishers;
  restOfPublishers.forEach((publisher) => log(` - ${publisher} (${!isMainnet ? 'Ethereum Mainnet' : 'OP Mainnet'})`));
  log();

  if (!options.skipConfirm) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Proceed?',
    });

    if (!confirm.confirmation) {
      log('Cancelled');
      process.exit(1);
    }
  }

  const mainnetPublishers = isMainnet ? publishers : mainnetCurrentPublishers;
  const optimismPublishers = isMainnet ? optimismCurrentPublishers : publishers;

  const packageNameHex = viem.stringToHex(packageName, { size: 32 });

  log('Submitting transaction, waiting for transaction to succeed...');
  log();

  const [hash] = await Promise.all([
    (async () => {
      const hash = await mainnetRegistry.setAdditionalPublishers(packageName, mainnetPublishers, optimismPublishers);

      log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
      log('');
      log(
        gray(
          `Waiting for the transaction to propagate to ${optimismRegistryConfig.name}... It may take approximately 1-3 minutes.`
        )
      );
      log('');

      return hash;
    })(),
    (async () => {
      // this should always resolve after the first promise but we want to make sure it runs at the same time
      await Promise.all([
        waitForEvent({
          eventName: 'PackagePublishersChanged',
          abi: mainnetRegistry.contract.abi,
          rpcUrl: _.last(mainnetRegistryConfig.providerUrl)!,
          expectedArgs: {
            name: packageNameHex,
            publisher: mainnetPublishers,
          },
        }),
        waitForEvent({
          eventName: 'PackagePublishersChanged',
          abi: optimismRegistry.contract.abi,
          rpcUrl: _.last(optimismRegistryConfig.providerUrl)!,
          expectedArgs: {
            name: packageNameHex,
            publisher: optimismPublishers,
          },
        }),
      ]);

      log(green('Success - The publishers list has been updated!'));
      log('');
    })(),
  ]);

  return hash;
}
