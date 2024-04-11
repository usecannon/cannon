import { OnChainRegistry, PackageReference } from '@usecannon/builder';
import { blueBright, gray, green, bold } from 'chalk';
import prompts from 'prompts';
import * as viem from 'viem';
import _ from 'lodash';

import { getChainById } from '../chains';
import { CliSettings } from '../settings';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';
import { resolveRegistryProviders } from '../util/provider';
import { waitUntilPackageIsRegistered } from '../util/register';
import { DEFAULT_REGISTRY_CONFIG } from '../constants';
import { privateKeyToAccount } from 'viem/accounts';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
  skipConfirm?: boolean;
}

export async function register({ cliSettings, options, packageRef }: Params) {
  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (isDefaultSettings) {
    // if the user has not set the registry settings, use mainnet as the default registry
    cliSettings.registries = cliSettings.registries.reverse();
  }

  const chainName = getChainById(Number(cliSettings.registries[0].chainId)).name || 'Unknown Chain';

  if (!cliSettings.privateKey) {
    const keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: `Provide a private key with gas on ${chainName} to publish this package on the registry`,
      style: 'password',
      validate: (key) => isPrivateKey(normalizePrivateKey(key)) || 'Private key is not valid',
    });

    if (!keyPrompt.value) {
      throw new Error('A valid private key is required.');
    }

    cliSettings.privateKey = checkAndNormalizePrivateKey(keyPrompt.value);
  }

  console.log('');
  console.log("You're using the following address:", bold(privateKeyToAccount(cliSettings.privateKey!).address));
  console.log('');

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

  const userAddress = mainRegistryProvider.signers[0].address;
  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await mainRegistry.getPackageOwner(packageName);

  if (viem.isAddressEqual(packageOwner, userAddress)) {
    throw new Error(`The package "${packageName}" is already registered by your address (${packageOwner}).`);
  }

  if (!viem.isAddressEqual(packageOwner, viem.zeroAddress)) {
    throw new Error(`The package "${packageName}" is already registered by "${packageOwner}".`);
  }

  const userBalance = await mainRegistryProvider.provider.getBalance({ address: userAddress });

  if (userBalance === BigInt(0)) {
    throw new Error(`Account "${userAddress}" does not have any funds to pay for gas.`);
  }

  const registerFee = await mainRegistry.getRegisterFee();
  const estimateGas = await mainRegistry.estimateGasForSetPackageOwnership(packageName);

  const cost = estimateGas + registerFee;

  if (cost > userBalance) {
    throw new Error(
      `Account "${userAddress}" does not have the required ${viem.formatEther(cost)} ETH for gas and registration fee`
    );
  }

  console.log(`Register fee: ${viem.formatEther(registerFee)} ETH`);
  console.log(`Address balance: ${viem.formatEther(userBalance)} ETH`);
  console.log(`Estimated gas for registering the package: ${viem.formatEther(estimateGas)} ETH`);

  console.log('');

  const confirm = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: 'Do you want to register this package?',
  });

  if (!confirm.confirmation) {
    process.exit(0);
  }

  const hash = await mainRegistry.setPackageOwnership(packageName);

  console.log('');
  console.log(`${green('You have registered your package successfully.')} ${blueBright('Transaction hash:')} ${hash}`);
  console.log('');

  if (isDefaultSettings) {
    console.log(
      gray('Waiting for registration to be confirmed on the OP Mainnet network. It may take approximately 1-3 minutes. \n')
    );
    console.log(
      gray(
        'Once confirmed, you will be able to publish your package to the Mainnet Cannon Registry or the OP Cannon Registry.'
      )
    );
    console.log('');
    await waitUntilPackageIsRegistered();
  }

  return hash;
}
