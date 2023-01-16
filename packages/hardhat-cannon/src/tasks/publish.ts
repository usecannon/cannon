import { task } from 'hardhat/config';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_PUBLISH } from '../task-names';
import { publish, DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS, PackageSpecification } from '@usecannon/cli';
import { ethers, Wallet } from 'ethers';
import { getHardhatSigners } from '../internal/get-hardhat-signers';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addOptionalPositionalParam('packageName', 'Name and version of the package to publish')
  .addOptionalParam('preset', 'The deployment preset used', 'main')
  .addOptionalParam('privateKey', 'Private key of the wallet to use when publishing.')
  .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
  .addOptionalParam('registryAddress', 'Address for a custom package registry.', DEFAULT_REGISTRY_ADDRESS)
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)

  .addOptionalParam('gasLimit', 'The maximum units of gas spent for the registration transaction')
  .addOptionalParam('maxFeePerGas', 'The maximum value (in gwei) for the base fee when submitting the registry transaction')
  .addOptionalParam(
    'maxPriorityFeePerGas',
    'The maximum value (in gwei) for the miner tip when submitting the registry transaction'
  )
  .addFlag('quiet', 'Only print JSON result at the end, no human readable output')
  .setAction(async ({ packageName, preset, privateKey, tags, gasLimit, maxFeePerGas, maxPriorityFeePerGas, quiet }, hre) => {
    let signer = getHardhatSigners(hre, hre.ethers.provider)[0];

    if (privateKey) {
      signer = new Wallet(privateKey, hre.ethers.provider);
    }

    const overrides: ethers.Overrides = {};

    if (maxFeePerGas) {
      overrides.maxFeePerGas = ethers.utils.parseUnits(maxFeePerGas, 'gwei');
    }

    if (maxPriorityFeePerGas) {
      overrides.maxPriorityFeePerGas = ethers.utils.parseUnits(maxPriorityFeePerGas, 'gwei');
    }

    if (gasLimit) {
      overrides.gasLimit = gasLimit;
    }

    const packageDefinition: PackageSpecification = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
      packageWithSettingsParams: packageName ? [packageName] : [],
    });

    await publish(
      `${packageDefinition.name}:${packageDefinition.version}`,
      tags,
      preset, // todo: get all variatns?
      signer,
      overrides,
      quiet
    );
  });
