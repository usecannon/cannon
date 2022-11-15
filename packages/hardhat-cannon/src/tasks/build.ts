import path from 'path';
import { task } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { HttpNetworkConfig } from 'hardhat/types';
import { ethers } from 'ethers';
import { build, runRpc, parseSettings } from '@usecannon/cli';
import { TASK_BUILD } from '../task-names';
import { CANNON_NETWORK_NAME } from '../constants';
import { augmentProvider } from '../internal/augment-provider';
import loadCannonfile from '../internal/load-cannonfile';
import { getHardhatSigners } from '../internal/get-hardhat-signers';
import { CannonRegistry } from '@usecannon/builder';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addPositionalParam('cannonfile', 'Path to a cannonfile to build', 'cannonfile.toml')
  .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
  .addOptionalParam(
    'upgradeFrom',
    'Wipe the deployment files, and use the deployment files from another cannon package as base'
  )
  .addOptionalParam('preset', 'The preset label for storing the build with the given settings', 'main')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .addFlag('wipe', 'Do not reuse any previously built artifacts')
  .setAction(async ({ cannonfile, settings, upgradeFrom, preset, noCompile, wipe, writeDeployments }, hre) => {
    if (hre.network.name !== CANNON_NETWORK_NAME) {
      throw new Error(
        `cannot build cannon image with hardhat network '${hre.network.name}'. Switch network to '${CANNON_NETWORK_NAME}', or use cannon:deploy instead.`
      );
    }

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

    const { name, version } = loadCannonfile(hre, cannonfile);

    const node = await runRpc({ port: hre.config.networks.cannon.port });

    let registry: CannonRegistry;
    if (hre.config.cannon.ipfsEndpoint) {
      const ipfsOptions = {
        url: hre.config.cannon.ipfsEndpoint,
        headers: {
          authorization: hre.config.cannon.ipfsAuthorizationHeader || '',
        },
      };

      registry = new CannonRegistry({
        ipfsOptions,
        signerOrProvider: new ethers.providers.JsonRpcProvider((hre.config.networks.mainnet as HttpNetworkConfig)?.url),
        address: hre.config.cannon.registryAddress,
      });
    } else {
      throw new Error('cannot download package dependencies! please configure an IPFS registry.');
    }

    const params = {
      cannonfilePath,
      node,
      packageDefinition: {
        name,
        version,
        settings: parsedSettings,
      },
      getArtifact: (contractName: string) => hre.artifacts.readArtifact(contractName),
      cannonDirectory: hre.config.paths.cannon,
      projectDirectory: hre.config.paths.root,
      preset,
      upgradeFrom,
      wipe,
      deploymentPath: writeDeployments ? path.resolve(writeDeployments) : undefined,
      registry,
    } as const;

    const { outputs, provider } = await build(params);

    const signers: ethers.Signer[] = [];

    for (const signer of getHardhatSigners(hre)) {
      const address = await signer.getAddress();
      await provider.send('hardhat_impersonateAccount', [address]);
      await provider.send('hardhat_setBalance', [address, ethers.utils.parseEther('10000').toHexString()]);
      signers.push(await provider.getSigner(address));
    }

    augmentProvider(hre, outputs);

    return { outputs, provider, signers };
  });
