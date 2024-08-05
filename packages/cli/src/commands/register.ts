import _ from 'lodash';
import Debug from 'debug';
import * as viem from 'viem';
import prompts from 'prompts';
import { blueBright, gray, green } from 'chalk';
import { OnChainRegistry, prepareMulticall, PackageReference, DEFAULT_REGISTRY_CONFIG } from '@usecannon/builder';

import { CliSettings } from '../settings';
import { log } from '../util/console';
import { waitForEvent } from '../util/wait-for-event';
import { resolveRegistryProviders, ProviderAction } from '../util/provider';
import { isPackageRegistered } from '../util/register';

const debug = Debug('cannon:cli:register');

interface Params {
  cliSettings: CliSettings;
  options: any;
  packageRefs: PackageReference[];
  fromPublish: boolean;
}

export async function register({ cliSettings, options, packageRefs, fromPublish }: Params) {
  const isDefaultSettings = _.isEqual(cliSettings.registries, DEFAULT_REGISTRY_CONFIG);
  if (!isDefaultSettings) throw new Error('Only default registries are supported for now');

  // mock provider urls when the execution comes from e2e tests
  if (cliSettings.isE2E) {
    // anvil optimism fork
    cliSettings.registries[0].providerUrl = ['http://127.0.0.1:9546'];
    // anvil mainnet fork
    cliSettings.registries[1].providerUrl = ['http://127.0.0.1:9545'];
  }

  debug('Registries list: ', cliSettings.registries);

  const [optimismRegistryConfig, mainnetRegistryConfig] = cliSettings.registries;
  const [optimismRegistryProvider, mainnetRegistryProvider] = await resolveRegistryProviders({
    cliSettings,
    action: ProviderAction.WriteProvider,
  });

  // if any of the packages are registered, throw an error
  const isRegistered = await Promise.all(
    packageRefs.map(async (pkg: PackageReference) => {
      // Run the two registry checks in parallel
      const [isRegisteredOnOptimism, isRegisteredOnMainnet] = await Promise.all([
        isPackageRegistered([optimismRegistryProvider], pkg.name, [optimismRegistryConfig.address]),
        isPackageRegistered([mainnetRegistryProvider], pkg.name, [mainnetRegistryConfig.address]),
      ]);

      debug(
        'Package name: ' +
          pkg.name +
          ' isRegisteredOnOptimism: ' +
          isRegisteredOnOptimism +
          ' isRegisteredOnMainnet: ' +
          isRegisteredOnMainnet
      );

      // Throw an error if the package is registered on both
      if (isRegisteredOnMainnet && isRegisteredOnOptimism) {
        throw new Error(`The package "${pkg.name}" is already registered.`);
      }

      return [isRegisteredOnOptimism, isRegisteredOnMainnet];
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

  debug('Address that will send the transaction: ', userAddress);

  const userBalance = await mainnetRegistryProvider.provider.getBalance({ address: userAddress });

  if (userBalance === BigInt(0)) {
    throw new Error(`Account "${userAddress}" does not have any funds to pay for gas.`);
  }

  const registerFee = await mainnetRegistry.getRegisterFee();

  debug('Register fee: ', viem.formatEther(registerFee));

  const transactions = await Promise.all(
    packageRefs.map((pkg: PackageReference, index: number) => {
      const [isRegisteredOnOptimism, isRegisteredOnMainnet] = isRegistered[index];

      const shouldNominateOwner = isRegisteredOnMainnet && !isRegisteredOnOptimism;

      debug('Should nominate owner for package: ', pkg.name, ' - ', shouldNominateOwner ? 'yes' : 'no');

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

  log('');
  log('You are about to register the following packages:');
  packageRefs.forEach((pkg: PackageReference) => log(' - Package:', blueBright(pkg.name)));
  log();
  log(`The transaction will cost ~${viem.formatEther(estimateGas * currentGasPrice)} ETH on ${mainnetRegistryConfig.name}.`);
  log('');

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

  log('Submitting transaction, waiting for transaction to succeed...');
  log();

  try {
    const [hash] = await Promise.all([
      (async () => {
        const hash = await mainnetRegistry.setPackageOwnership(multicallTx);

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
        return Promise.all(
          packageRefs.map((pkg: PackageReference) => {
            const packageNameHex = viem.stringToHex(pkg.name, { size: 32 });

            return Promise.all([
              waitForEvent({
                eventName: 'PackageOwnerChanged',
                abi: mainnetRegistry.contract.abi,
                providerUrl: optimismRegistryConfig.providerUrl![0],
                expectedArgs: {
                  name: packageNameHex,
                  owner: userAddress,
                },
              }),
              waitForEvent({
                eventName: 'PackagePublishersChanged',
                abi: mainnetRegistry.contract.abi,
                providerUrl: optimismRegistryConfig.providerUrl![0],
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

    packageRefs.map(async (pkg) => {
      log(green(`Success - Package "${pkg.name}" has been registered.`));
    });

    if (fromPublish) {
      log('');
      log(gray('We will continue with the publishing process.'));
    }

    return hash;
  } catch (e) {
    throw new Error(`Failed to register package: ${(e as Error).message}`);
  }
}
