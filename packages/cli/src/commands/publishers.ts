import { OnChainRegistry, PackageReference } from '@usecannon/builder';
import { blueBright, gray, green } from 'chalk';
import _ from 'lodash';
import prompts from 'prompts';
import * as viem from 'viem';
import { DEFAULT_REGISTRY_CONFIG } from '../constants';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';
import { CliSettings } from '../settings';
import { resolveRegistryProviders } from '../util/provider';
import { waitForEvent } from '../util/register';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
  skipConfirm?: boolean;
}

export async function publishers({ cliSettings, options, packageRef }: Params) {
  const publisherToAdd = options.add;
  const publishersToRemove = options.remove;

  // throw an error if the user has not provided any address
  if (!publisherToAdd && !publishersToRemove) {
    throw new Error('Please provide either --add or --remove option');
  }

  // throw an error if the user has provided invalid address
  if (publisherToAdd && !viem.isAddress(publisherToAdd)) {
    throw new Error('Invalid address provided for --add option');
  }
  if (publishersToRemove && !viem.isAddress(publishersToRemove)) {
    throw new Error('Invalid address provided for --remove option');
  }

  // Check if both options provided and addresses are the same
  if (publisherToAdd && publishersToRemove && viem.isAddressEqual(publisherToAdd, publishersToRemove)) {
    throw new Error('Cannot add and remove the same address in one operation');
  }

  if (!cliSettings.privateKey) {
    const keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter the private key of the package owner',
      style: 'password',
      validate: (key) => isPrivateKey(normalizePrivateKey(key)) || 'Private key is not valid',
    });

    if (!keyPrompt.value) {
      throw new Error('A valid private key is required.');
    }

    cliSettings.privateKey = checkAndNormalizePrivateKey(keyPrompt.value);
  }

  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);

  const [mainnetRegistryProvider] = await resolveRegistryProviders({
    ...cliSettings,
    // if the user has not set the registry settings, use mainnet as the default registry
    registries: isDefaultSettings ? cliSettings.registries.reverse() : cliSettings.registries,
  });

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

  const mainRegistry = new OnChainRegistry({
    signer: mainnetRegistryProvider.signers[0],
    provider: mainnetRegistryProvider.provider,
    address: cliSettings.registries[0].address,
    overrides,
  });

  const userAddress = mainnetRegistryProvider.signers[0].address;
  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await mainRegistry.getPackageOwner(packageName);

  // throw an error if the package is not registered
  if (viem.isAddressEqual(packageOwner, viem.zeroAddress)) {
    throw new Error('The package is not registered already.');
  }
  // throw an error if the package is not registered by the user address
  if (!viem.isAddressEqual(packageOwner, userAddress)) {
    throw new Error(`Unauthorized: The package "${packageName}" is already registered by "${packageOwner}".`);
  }

  const currentPublishers = await mainRegistry.getAdditionalPublishers(packageName);

  // copy the current publishers
  let publishers = [...currentPublishers];

  // remove publisher if specified
  if (publishersToRemove && currentPublishers.some((p) => viem.isAddressEqual(p, publishersToRemove))) {
    publishers = publishers.filter((p) => !viem.isAddressEqual(p, publishersToRemove));
  }

  // add new publisher if specified
  if (publisherToAdd && !currentPublishers.some((p) => viem.isAddressEqual(p, publisherToAdd))) {
    publishers.push(publisherToAdd);
  }

  if (isDefaultSettings) {
    const [hash] = await Promise.all([
      (async () => {
        const hash = await mainRegistry.setAdditionalPublisher(packageName, publishers);

        console.log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
        console.log('');
        console.log(
          gray('Waiting for the transaction to propagate to Optimism Mainnet... It may take approximately 1-3 minutes.')
        );
        console.log('');

        return hash;
      })(),
      (async () => {
        // this should always resolve after the first promise but we want to make sure it runs at the same time
        await waitForEvent({ eventName: 'PackagePublishersChanged', abi: mainRegistry.contract.abi });

        console.log(green('Success!'));
        console.log('');
      })(),
    ]);

    return hash;
  } else {
    const hash = await mainRegistry.setPackageOwnership(packageName);
    console.log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
    return hash;
  }
}
