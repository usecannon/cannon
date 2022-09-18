import { task } from 'hardhat/config';
import { deploy, PackageDefinition } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { parsePackageArguments } from '@usecannon/cli/dist/src/util/params';
import { ethers } from 'ethers';
import { HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { CANNON_NETWORK_NAME } from '../constants';
import { augmentProvider } from '../internal/augment-provider';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addOptionalParam('overrideManifest', 'Use a different manifest file for this network deployment. NOTE: this is not reccomended for regular use, it is simply an escape hatch')
  .addVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .addOptionalParam('impersonate', 'Run deployment without requiring any private keys. The value of this flag determines the default signer.')
  .addFlag('writeDeployments', 'Wether to write deployment files when using the --dry-run flag')
  .setAction(async (opts, hre) => {
    if (hre.network.name === CANNON_NETWORK_NAME) {
      throw new Error(`cannot deploy to '${CANNON_NETWORK_NAME}'. Use cannon:build instead.`);
    }

    const packageDefinition: PackageDefinition = (opts.packageWithSettings as string[]).reduce((result, val) => {
      return parsePackageArguments(val, result);
    }, {} as PackageDefinition);

    if (!hre.network.config.chainId) {
      throw new Error('Selected network must have chainId set in hardhat configuration');
    }

    let [signer] = (await hre.ethers.getSigners()) as ethers.Signer[];
    let provider = hre.ethers.provider;

    const writeDeployments = !opts.dryRun || (opts.dryRun && opts.writeDeployments);

    const { outputs } = await deploy({
      packageDefinition,
      provider: hre.ethers.provider,
      mnemonic: (hre.network.config.accounts as HttpNetworkHDAccountsConfig).mnemonic,
      privateKey: (hre.network.config.accounts as string[])[0],
      impersonate: opts.impersonate,
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

    augmentProvider(hre, outputs);

    return { outputs, provider, signer };
  });
