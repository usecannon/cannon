import { task } from 'hardhat/config';
import { bold, yellowBright } from 'chalk';
import { TASK_PUBLISH } from '../task-names';
import { publish, DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS } from '@usecannon/cli';
import { HttpNetworkConfig } from 'hardhat/types';
import { RegistrationOptions } from '@usecannon/cli/dist/src/commands/publish';
import { Wallet } from 'ethers';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addPositionalParam('packageName', 'Name and version of the package to publish')
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
  .addFlag('skipRegister', 'Just upload to IPFS. Do not register the package on-chain')
  .setAction(
    async (
      { directory, packageName, privateKey, tags, registryAddress, ipfsEndpoint, ipfsAuthorizationHeader, skipRegister },
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
      }

      await publish(directory, packageName, tags, ipfsEndpoint, ipfsAuthorizationHeader, registrationOptions);
    }
  );
