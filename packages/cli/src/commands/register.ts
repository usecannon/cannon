import { OnChainRegistry, PackageReference } from '@usecannon/builder';
import { blueBright } from 'chalk';
import prompts from 'prompts';
import * as viem from 'viem';
import _ from 'lodash';

import { getChainById } from '../chains';
import { CliSettings } from '../settings';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';
import { getChainIdFromProviderUrl, isURL, resolveRegistryProviders } from '../util/provider';
import { waitUntilPackageIsRegistered } from '../util/register';
import { DEFAULT_REGISTRY_CONFIG } from '../constants';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
  skipConfirm?: boolean;
}

export async function register({ cliSettings, options, packageRef }: Params) {
  let chainName = 'Unknown Network';

  // if registry settings have been changed by the user, use the first option
  let registryChainId = cliSettings.registries[0].chainId;
  let registryProviderUrl = cliSettings.registries[0].providerUrl![0];

  // if registry settings have not been changed, use the default registry settings
  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (isDefaultSettings) {
    const [, mainnet] = cliSettings.registries;
    registryChainId = mainnet.chainId;
    registryProviderUrl = mainnet.providerUrl![0];
  }

  if (registryProviderUrl) {
    if (isURL(registryProviderUrl)) {
      const chainId = await getChainIdFromProviderUrl(registryProviderUrl);
      chainName = getChainById(Number(chainId)).name || 'Unknown Network';
    } else {
      if (!registryChainId) {
        throw new Error(
          'Please, provide a valid --registry-chain-id or --registry-provider-url value to register a package.'
        );
      }

      chainName = getChainById(Number(registryChainId)).name || 'Unknown Network';
    }
  } else {
    if (!registryChainId) {
      throw new Error('Please, provide a valid --registry-chain-id or --registry-provider-url value to register a package.');
    }

    chainName = getChainById(Number(registryChainId)).name || 'Unknown Network';
  }

  if (!cliSettings.privateKey) {
    const keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: `Provide a private key with gas on ${chainName} to publish this package on the registry`,
      style: 'password',
      validate: (key) => isPrivateKey(normalizePrivateKey(key)) || 'Private key is not valid',
    });

    if (!keyPrompt.value) {
      console.log('A valid private key is required.');
      process.exit(1);
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
    address: cliSettings.registries[0].address,
    overrides,
  });

  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await mainRegistry.getPackageOwner(packageName);

  if (!viem.isAddressEqual(packageOwner, viem.zeroAddress)) {
    throw new Error(`The package "${packageName}" is already registered by "${packageOwner}".`);
  }

  const hash = await mainRegistry.setPackageOwnership(packageName);

  if (isDefaultSettings) {
    await waitUntilPackageIsRegistered();
  }

  console.log(blueBright('Transaction:'));
  console.log(`  - ${hash}`);

  return hash;
}
