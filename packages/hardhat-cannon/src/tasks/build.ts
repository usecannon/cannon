import path from 'path';
import { task } from 'hardhat/config';
import { HttpNetworkConfig } from 'hardhat/types';
import { HARDHAT_NETWORK_NAME } from 'hardhat/plugins';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { build } from '@usecannon/cli';
import { parseSettings } from '@usecannon/cli/dist/src/util/params';
import { TASK_BUILD } from '../task-names';
import { ethers } from 'ethers';
import { CannonWrapperJsonRpcProvider } from '@usecannon/builder';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addPositionalParam('cannonfile', 'Path to a cannonfile to build', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
  .addOptionalParam('preset', 'The preset label for storing the build with the given settings', 'main')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .setAction(async ({ cannonfile, settings, preset, noCompile }, hre) => {
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

    const forkUrl =
      hre.network.name === HARDHAT_NETWORK_NAME
        ? undefined
        : (hre.config.networks[hre.network.name] as HttpNetworkConfig).url;

    const signers = await hre.ethers.getSigners();

    const params = {
      cannonfilePath,
      settings: parsedSettings,
      getArtifact: (contractName: string) => hre.artifacts.readArtifact(contractName),
      cannonDirectory: hre.config.paths.cannon,
      projectDirectory: hre.config.paths.root,
      forkUrl,
      chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId,
      preset,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
    } as const;

    let { outputs, provider } = await build(params);

    // set provider to cannon wrapper to allow error parsing
    if ((provider as ethers.providers.JsonRpcProvider).connection) {
      provider = new CannonWrapperJsonRpcProvider(outputs, (provider as ethers.providers.JsonRpcProvider).connection);
    }

    return { outputs, provider, signers };
  });
