import _ from 'lodash';
import path from 'path';
import { task } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { build } from '@usecannon/cli';
import { TASK_BUILD } from '../task-names';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from './constants';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addPositionalParam('cannonfile', 'Name and version of the cannon package to inspect', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('Custom settings for building the cannonfile')
  .addOptionalParam('preset', 'The preset label for storing the build with the given settings', 'main')
  .addOptionalParam('cannonDirectory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .addOptionalParam(
    'registryIpfsUrl',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .addOptionalParam('registryRpcUrl', 'Network endpoint for interacting with the registry', DEFAULT_REGISTRY_ENDPOINT)
  .addOptionalParam('registryAddress', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .setAction(
    async (
      { cannonfile, settings, preset, cannonDirectory, registryIpfsUrl, registryRpcUrl, registryAddress, noCompile },
      hre
    ) => {
      if (!noCompile) {
        await hre.run(TASK_COMPILE);
        console.log('');
      }

      const cannonfilePath = path.resolve(hre.config.paths.root, cannonfile);
      build({
        cannonfilePath,
        settings,
        getArtifact: hre.artifacts.readArtifact,
        cannonDirectory: cannonDirectory || hre.config.paths.cannon,
        projectDirectory: hre.config.paths.root,
        preset,
        registryIpfsUrl,
        registryRpcUrl,
        registryAddress,
      });
    }
  );
