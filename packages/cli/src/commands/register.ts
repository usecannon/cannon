import _ from 'lodash';
import * as viem from 'viem';
import prompts from 'prompts';
import { blueBright, gray, green } from 'chalk';
import { OnChainRegistry, prepareMulticall } from '@usecannon/builder';

import { CliSettings } from '../settings';
import { PackageSpecification } from '../types';
import { DEFAULT_REGISTRY_CONFIG } from '../constants';
import { resolveRegistryProviders } from '../util/provider';
import { isPackageRegistered, waitForEvent } from '../util/register';
import { checkAndNormalizePrivateKey, isPrivateKey, normalizePrivateKey } from '../helpers';

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRef: PackageSpecification[];
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

  // if any of the packages are registered, throw an error
  const isRegistered = await Promise.all(
    packageRef.map(async (pkg: PackageSpecification) => {
      // Run the two registry checks in parallel
      const [isRegisteredOnMainnet, isRegisteredOnOptimism] = await Promise.all([
        isPackageRegistered([mainnetRegistryProvider], pkg.name, [mainnetRegistryConfig.address]),
        isPackageRegistered([optimismRegistryProvider], pkg.name, [optimismRegistryConfig.address]),
      ]);

      // Throw an error if the package is registered on both
      if (isRegisteredOnMainnet && isRegisteredOnOptimism) {
        throw new Error(`The package "${pkg.name}" is already registered.`);
      }

      return [isRegisteredOnMainnet, isRegisteredOnOptimism];
    })
  );

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

  const userBalance = await mainnetRegistryProvider.provider.getBalance({ address: userAddress });

  if (userBalance === BigInt(0)) {
    throw new Error(`Account "${userAddress}" does not have any funds to pay for gas.`);
  }

  const registerFee = await mainnetRegistry.getRegisterFee();

  const transactions = await Promise.all(
    packageRef.map((pkg: PackageSpecification, index: number) => {
      const [isRegisteredOnMainnet, isRegisteredOnOptimism] = isRegistered[index];
      const shouldNominateOwner = isRegisteredOnMainnet && !isRegisteredOnOptimism;

      return mainnetRegistry.prepareSetPackageOwnership(pkg.name, undefined, shouldNominateOwner);
    })
  );

  const multicallTx = prepareMulticall(transactions.flat());

  // Note: for some reason, estimate gas is not accurate
  // Note: if the user does not have enough gas, the estimateGasForSetPackageOwnership will throw an error
  const estimateGas = await mainnetRegistry.estimateGasForSetPackageOwnership(multicallTx);

  const cost = estimateGas + registerFee;
  if (cost > userBalance) {
    throw new Error(
      `Account "${userAddress}" does not have the required ${viem.formatEther(cost)} ETH for gas and registration fee`
    );
  }

  const currentGasPrice = await mainnetRegistryProvider.provider.getGasPrice();

  console.log('');
  console.log('You are about to register the following packages:');
  packageRef.forEach((pkg: PackageSpecification) => console.log(' - Package:', blueBright(pkg.name)));
  console.log();
  console.log(
    `The transaction will cost ~${viem.formatEther(estimateGas * currentGasPrice)} ETH on ${mainnetRegistryConfig.name}.`
  );
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

  try {
    const [hash] = await Promise.all([
      (async () => {
        const hash = await mainnetRegistry.setPackageOwnership(multicallTx);

        console.log(`${green('Success!')} (${blueBright('Transaction Hash')}: ${hash})`);
        console.log('');
        console.log(
          gray(
            `Waiting for the transaction to propagate to ${optimismRegistryConfig.name}... It may take approximately 1-3 minutes.`
          )
        );
        console.log('');

        return hash;
      })(),
      (async () => {
        // this should always resolve after the first promise but we want to make sure it runs at the same time
        return Promise.all(
          packageRef.map((pkg: PackageSpecification) => {
            const packageNameHex = viem.stringToHex(pkg.name, { size: 32 });

            return Promise.all([
              waitForEvent({
                eventName: 'PackageOwnerChanged',
                abi: mainnetRegistry.contract.abi,
                chainId: optimismRegistryConfig.chainId!,
                expectedArgs: {
                  name: packageNameHex,
                  owner: userAddress,
                },
              }),
              waitForEvent({
                eventName: 'PackagePublishersChanged',
                abi: mainnetRegistry.contract.abi,
                chainId: optimismRegistryConfig.chainId!,
                expectedArgs: {
                  name: packageNameHex,
                  publisher: [userAddress],
                },
              }),
            ]);
          })
        );
      })(),
    ]);

    if (fromPublish) {
      console.log(gray('We will continue with the publishing process.'));
    } else {
      packageRef.map(async (pkg) => {
        console.log(green(`Success - Package "${pkg.name}" has been registered.`));
      });
    }

    return hash;
  } catch (e) {
    throw new Error(`Failed to register package: ${(e as Error).message}`);
  }
}
