import { task } from 'hardhat/config';
import { bold, yellowBright } from 'chalk';
import { TASK_PUBLISH } from '../task-names';
import { publish } from '@usecannon/cli';
import { DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS } from '@usecannon/cli/dist/src/constants';
import { HttpNetworkConfig } from 'hardhat/types';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addPositionalParam('packageName', 'Name and version of the package to publish')
  .addOptionalParam('privateKey', 'Private key of the wallet to use when publishing')
  .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
  .addOptionalParam('registryAddress', 'Address for a custom package registry', DEFAULT_REGISTRY_ADDRESS)
  .addOptionalParam('ipfsEndpoint', 'Address for an IPFS endpoint')
  .addOptionalParam('ipfsAuthorizationHeader', 'Authorization header for requests to the IPFS endpoint')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(
    async ({ directory, packageName, privateKey, tags, registryAddress, ipfsEndpoint, ipfsAuthorizationHeader }, hre) => {
      if (hre.network.name == 'hardhat') {
        console.log(yellowBright(`The ${TASK_PUBLISH} task must be run with ${bold('--network mainnet')}`));
        process.exit();
      }
      const registryEndpoint = (hre.network.config as HttpNetworkConfig).url;
      console.log(registryEndpoint);

      if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
      }

      if (registryAddress === DEFAULT_REGISTRY_ADDRESS && hre.config.cannon.registryAddress) {
        registryAddress = hre.config.cannon.registryAddress;
      }

      if (hre.config.cannon.ipfsEndpoint) {
        ipfsEndpoint = hre.config.cannon.ipfsEndpoint;
      }

      if (!ipfsAuthorizationHeader && hre.config.cannon.ipfsAuthorizationHeader) {
        ipfsAuthorizationHeader = hre.config.cannon.ipfsAuthorizationHeader;
      }

      if (!privateKey) {
        privateKey = (hre.config.networks[hre.network.name].accounts as string[])[0];
      }

      await publish(
        directory,
        privateKey,
        packageName,
        tags,
        registryAddress,
        registryEndpoint,
        ipfsEndpoint,
        ipfsAuthorizationHeader
      );
    }
  );
