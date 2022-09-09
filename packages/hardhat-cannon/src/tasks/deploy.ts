import { task } from 'hardhat/config';
import { deploy, PackageDefinition } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { parsePackageArguments } from '@usecannon/cli/dist/src/util/params';
import { getProvider, runRpc } from '@usecannon/cli/dist/src/rpc';
import { ethers } from 'ethers';
import { CannonWrapperJsonRpcProvider } from '@usecannon/builder';
import { HttpNetworkConfig } from 'hardhat/types';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .addFlag('writeDeployments', 'Wether to write deployment files when using the --dry-run flag')
  .setAction(async (opts, hre) => {
    const packageDefinition: PackageDefinition = (opts.packageWithSettings as string[]).reduce((result, val) => {
      return parsePackageArguments(val, result);
    }, {} as PackageDefinition);

    if (!hre.network.config.chainId) {
      throw new Error('Selected network must have chainId set in hardhat configuration');
    }

    let [signer] = await hre.ethers.getSigners();
    let provider = hre.ethers.provider;

    if (opts.dryRun) {
      const anvilInstance = await runRpc({
        forkUrl: (hre.config.networks[hre.network.name] as HttpNetworkConfig).url,
        port: 8545,
        chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId,
      });

      provider = await getProvider(anvilInstance);

      if (signer) {
        signer = signer.connect(provider);
      }
    }

    const writeDeployments = !opts.dryRun || (opts.dryRun && opts.writeDeployments);

    const { outputs } = await deploy({
      packageDefinition,
      provider,
      signer,
      preset: opts.preset,
      dryRun: opts.dryRun,
      prefix: opts.prefix,
      cannonDirectory: hre.config.paths.cannon,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
      projectDirectory: hre.config.paths.root,
      deploymentPath: writeDeployments ? hre.config.paths.deployments : '',
    });

    // set provider to cannon wrapper to allow error parsing
    if ((provider as ethers.providers.JsonRpcProvider).connection) {
      provider = new CannonWrapperJsonRpcProvider(outputs, (provider as ethers.providers.JsonRpcProvider).connection);
    }

    return { outputs, provider, signer };
  });
