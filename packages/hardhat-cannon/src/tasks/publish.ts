import { task } from 'hardhat/config';
import { bold, yellowBright } from 'chalk';
import { SUBTASK_LOAD_PACKAGE_DEFINITION, TASK_PUBLISH } from '../task-names';
import { publish, DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS, PackageDefinition } from '@usecannon/cli';
import { RegistrationOptions } from '@usecannon/cli/dist/src/commands/publish';
import { ethers, Wallet } from 'ethers';
import _ from 'lodash';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addOptionalPositionalParam('packageName', 'Name and version of the package to publish')
  .addOptionalParam(
    'privateKey',
    'Private key of the wallet to use when publishing. Ignored if `--skip-register` is supplied'
  )
  .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
  .addOptionalParam(
    'registryAddress',
    'Address for a custom package registry. Ignored if `--skip-register` is supplied',
    DEFAULT_REGISTRY_ADDRESS
  )
  .addOptionalParam('ipfsEndpoint', 'Address for an IPFS endpoint')
  .addOptionalParam('ipfsAuthorizationHeader', 'Authorization header for requests to the IPFS endpoint')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)

  .addOptionalParam('gasLimit', 'The maximum units of gas spent for the registration transaction')
  .addOptionalParam('maxFeePerGas', 'The maximum value (in gwei) for the base fee when submitting the registry transaction')
  .addOptionalParam(
    'maxPriorityFeePerGas',
    'The maximum value (in gwei) for the miner tip when submitting the registry transaction'
  )
  .addFlag('skipRegister', 'Just upload to IPFS. Do not register the package on-chain')
  .addFlag('quiet', 'Only print JSON result at the end, no human readable output')
  .setAction(
    async (
      {
        directory,
        packageName,
        privateKey,
        tags,
        registryAddress,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        ipfsEndpoint,
        ipfsAuthorizationHeader,
        skipRegister,
        quiet,
      },
      hre
    ) => {
      if (hre.network.name == 'hardhat') {
        console.log(yellowBright(`The ${TASK_PUBLISH} task must be run with ${bold('--network mainnet')}`));
        process.exit();
      }

      if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
      }

      if (hre.config.cannon.ipfsEndpoint) {
        ipfsEndpoint = hre.config.cannon.ipfsEndpoint;
      }

      if (!ipfsAuthorizationHeader && hre.config.cannon.ipfsAuthorizationHeader) {
        ipfsAuthorizationHeader = hre.config.cannon.ipfsAuthorizationHeader;
      }

      let registrationOptions: RegistrationOptions | undefined = undefined;
      if (!skipRegister) {
        registrationOptions = {
          registryAddress,
          signer: (await hre.ethers.getSigners())[0],
        };

        if (registryAddress === DEFAULT_REGISTRY_ADDRESS && hre.config.cannon.registryAddress) {
          registryAddress = hre.config.cannon.registryAddress;
        }

        if (privateKey) {
          registrationOptions.signer = new Wallet(privateKey, hre.ethers.provider);
        }

        if (maxFeePerGas) {
          _.set(registrationOptions, 'overrides.maxFeePerGas', ethers.utils.parseUnits(maxFeePerGas, 'gwei'));
        }

        if (maxPriorityFeePerGas) {
          _.set(
            registrationOptions,
            'overrides.maxPriorityFeePerGas',
            ethers.utils.parseUnits(maxPriorityFeePerGas, 'gwei')
          );
        }

        if (gasLimit) {
          _.set(registrationOptions, 'overrides.gasLimit', gasLimit);
        }
      }

      const packageDefinition: PackageDefinition = await hre.run(SUBTASK_LOAD_PACKAGE_DEFINITION, {
        packageWithSettingsParams: packageName ? [packageName] : [],
      });

      await publish(
        directory,
        `${packageDefinition.name}:${packageDefinition.version}`,
        tags,
        ipfsEndpoint,
        ipfsAuthorizationHeader,
        registrationOptions,
        quiet
      );
    }
  );
