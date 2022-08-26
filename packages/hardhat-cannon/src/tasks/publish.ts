import { task } from 'hardhat/config';
import { bold, yellowBright } from 'chalk';

import { TASK_PUBLISH } from '../task-names';
import { publish } from '@usecannon/cli';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_ENDPOINT } from '@usecannon/cli/dist/src/constants';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addPositionalParam('packageName', 'Name and version of the package to publish')
  .addOptionalParam('privateKey', 'Private key of the wallet to use when publishing')
  .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
  .addOptionalParam('registryAddress', 'Address for a custom package registry', DEFAULT_REGISTRY_ADDRESS)
  .addOptionalParam('registryEndpoint', 'Address for RPC endpoint for the registry', DEFAULT_REGISTRY_ENDPOINT)
  .addOptionalParam('ipfsEndpoint', 'Address for an IPFS endpoint')
  .addOptionalParam('ipfsAuthorizationHeader', 'Authorization header for requests to the IPFS endpoint')
  .addOptionalParam('directory', 'Path to a custom package directory', '~/.local/cannon')
  .setAction(
    async (
      { directory, packageName, privateKey, tags, registryAddress, registryEndpoint, ipfsEndpoint, ipfsAuthorizationHeader },
      hre
    ) => {
      if (hre.network.name == 'hardhat') {
        console.log(yellowBright(`The ${TASK_PUBLISH} task must be run with ${bold('--network mainnet')}`));
        process.exit();
      }

      if (directory == '~/.local/cannon' && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
      }

      if (registryAddress === DEFAULT_REGISTRY_ADDRESS && hre.config.cannon.registryAddress) {
        registryAddress = hre.config.cannon.registryAddress;
      }

      if (registryEndpoint === DEFAULT_REGISTRY_ENDPOINT && hre.config.cannon.registryEndpoint) {
        registryEndpoint = hre.config.cannon.registryEndpoint;
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
