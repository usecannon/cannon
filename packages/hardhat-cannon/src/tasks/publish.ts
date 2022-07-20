import { task } from 'hardhat/config';
import { bold, yellowBright } from 'chalk';

import { TASK_PUBLISH } from '../task-names';
import { publish } from '@usecannon/cli';

task(TASK_PUBLISH, 'Publish a Cannon package to the registry')
  .addPositionalParam('packageName', 'Name and version of the package to publish')
  .addOptionalParam('privateKey', 'Private key of the wallet to use when publishing')
  .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
  .addOptionalParam('registryAddress', 'Address for a custom package registry', '0xA98BE35415Dd28458DA4c1C034056766cbcaf642')
  .addOptionalParam('registryEndpoint', 'Address for RPC endpoint for the registry', 'https://cloudflare-eth.com/v1/mainnet')
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

      if (registryAddress == '0xA98BE35415Dd28458DA4c1C034056766cbcaf642' && hre.config.cannon.registryAddress) {
        registryAddress = hre.config.cannon.registryAddress;
      }

      if (registryEndpoint == 'https://cloudflare-eth.com/v1/mainnet' && hre.config.cannon.registryEndpoint) {
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
