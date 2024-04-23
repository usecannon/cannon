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
  publisher: viem.Address;
  skipConfirm?: boolean;
}

export async function addPublisher({ cliSettings, options, packageRef, publisher }: Params) {
  if (!viem.isAddress(publisher)) throw new Error('Invalid address');

  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  // if the user has not set the registry settings, use mainnet as the default registry
  const registryConfig = isDefaultSettings ? cliSettings.registries[1] : cliSettings.registries[0];

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

  const [mainRegistryProvider] = await resolveRegistryProviders(cliSettings);

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
    signer: mainRegistryProvider.signers[0],
    provider: mainRegistryProvider.provider,
    address: registryConfig.address,
    overrides,
  });

  const userAddress = mainRegistryProvider.signers[0].address;
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

  const additionalPublishers = await mainRegistry.getAdditionalPublishers(packageName);

  // throw an error if the address is already a publisher
  const isExistingPublisher = additionalPublishers.some((_publisher) => viem.isAddressEqual(_publisher, publisher));
  if (isExistingPublisher) {
    throw new Error(`The address "${options.additionalPublisher}" is already a publisher for "${packageName}" package.`);
  }

  const confirm = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: `Do you want to add ${options.additionalPublisher} as a publisher?`,
  });

  if (!confirm.confirmation) {
    process.exit(0);
  }

  // Add the new publisher to the list of publishers
  const publishers = Array.from(new Set([...additionalPublishers, publisher]));

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
