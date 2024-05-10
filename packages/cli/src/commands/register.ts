import { OnChainRegistry, PackageReference } from '@usecannon/builder';
import { blueBright, gray, green } from 'chalk';
import _ from 'lodash';
import prompts from 'prompts';
import * as viem from 'viem';

import { CliSettings } from '../settings';
import { DEFAULT_REGISTRY_CONFIG } from '../constants';
import { resolveRegistryProviders } from '../util/provider';
import { isPackageRegistered, waitForEvent } from '../util/register';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: string;
  fromPublish: boolean;
}

export async function register({ cliSettings, options, packageRef, fromPublish }: Params) {
  if (!cliSettings.privateKey) {
    const keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter the private key for the signer that will register packages',
      style: 'password',
      validate: (key) => isPrivateKey(normalizePrivateKey(key)) || 'Private key is not valid',
    });

    if (!keyPrompt.value) {
      throw new Error('A valid private key is required.');
    }

    cliSettings.privateKey = checkAndNormalizePrivateKey(keyPrompt.value);
  }

  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (!isDefaultSettings) throw new Error('Only default registries are supported for now');

  const [optimismRegistryConfig, mainnetRegistryConfig] = cliSettings.registries;
  const [optimismRegistryProvider, mainnetRegistryProvider] = await resolveRegistryProviders(cliSettings);

  const isRegisteredOnMainnet = await isPackageRegistered(
    [mainnetRegistryProvider],
    packageRef,
    mainnetRegistryConfig.address
  );

  const isRegisteredOnOptimism = await isPackageRegistered(
    [optimismRegistryProvider],
    packageRef,
    optimismRegistryConfig.address
  );

  if (isRegisteredOnMainnet && isRegisteredOnOptimism) {
    throw new Error(`The package "${new PackageReference(packageRef).name}" is already registered.`);
  }

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

  const userAddress = mainnetRegistryProvider.signers[0].address;
  const packageName = new PackageReference(packageRef).name;

  const userBalance = await mainnetRegistryProvider.provider.getBalance({ address: userAddress });

  if (userBalance === BigInt(0)) {
    throw new Error(`Account "${userAddress}" does not have any funds to pay for gas.`);
  }

  const registerFee = await mainnetRegistry.getRegisterFee();

  // Note: for some reason, estimate gas is not accurate
  // Note: if the user does not have enough gas, the estimateGasForSetPackageOwnership will throw an error
  const estimateGas = await mainnetRegistry.estimateGasForSetPackageOwnership(packageName, undefined, shouldNominateOwner);

  const cost = estimateGas + registerFee;

  if (cost > userBalance) {
    throw new Error(
      `Account "${userAddress}" does not have the required ${viem.formatEther(cost)} ETH for gas and registration fee`
    );
  }

  console.log('');
  console.log(`This will cost ${viem.formatEther(estimateGas)} ETH on Ethereum Mainnet.`);
  console.log('');

  const confirm = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: 'Proceed?',
  });

  if (!confirm.confirmation) {
    process.exit(0);
  }

  console.log('Submitting transaction...');

  // to migrate a package, we need to nominate the owner first
  const shouldNominateOwner = isRegisteredOnMainnet && !isRegisteredOnOptimism;

  try {
    const [hash] = await Promise.all([
      (async () => {
        const hash = await mainnetRegistry.setPackageOwnership(packageName, undefined, shouldNominateOwner);

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
        await Promise.all([
          waitForEvent({
            eventName: 'PackageOwnerChanged',
            abi: mainnetRegistry.contract.abi,
            chainId: optimismRegistryConfig.chainId!,
          }),
          waitForEvent({
            eventName: 'PackagePublishersChanged',
            abi: mainnetRegistry.contract.abi,
            chainId: optimismRegistryConfig.chainId!,
          }),
        ]);

        console.log(green('Success!'));
        console.log('');

        if (fromPublish) {
          console.log(gray('We will continue with the publishing process.'));
        } else {
          console.log(
            gray(`Run 'cannon publish ${packageName}' (after building a ${packageName} deployment) to publish a package.`)
          );
        }
      })(),
    ]);

    return hash;
  } catch (e) {
    throw new Error(`Failed to register package: ${(e as Error).message}`);
  }
}
