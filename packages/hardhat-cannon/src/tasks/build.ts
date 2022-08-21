import path from 'path';
import { task } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { build } from '@usecannon/cli';
import { TASK_BUILD } from '../task-names';
import { parseSettings } from '@usecannon/cli/dist/src/util/params';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from '@usecannon/cli/dist/src/constants';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addPositionalParam('cannonfile', 'Path to a cannonfile to build', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
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

      // If the first param is not a cannonfile, it should be parsed as settings
      if (typeof cannonfile === 'string' && !cannonfile.endsWith('.toml')) {
        settings.unshift(cannonfile);
        cannonfile = 'cannonfile.toml';
      }

      const cannonfilePath = path.resolve(hre.config.paths.root, cannonfile);
      const parsedSettings = parseSettings(settings);

      console.log({
        cannonfilePath,
        settings: parsedSettings,
        getArtifact: hre.artifacts.readArtifact,
        cannonDirectory: cannonDirectory || hre.config.paths.cannon,
        projectDirectory: hre.config.paths.root,
        preset,
        registryIpfsUrl,
        registryRpcUrl,
        registryAddress,
      });

      return build({
        cannonfilePath,
        settings: parsedSettings,
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
