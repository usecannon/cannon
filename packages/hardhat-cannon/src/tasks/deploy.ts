import { task } from 'hardhat/config';
import { deploy, PackageDefinition, parsePackageArguments } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { ethers } from 'ethers';
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { CANNON_NETWORK_NAME } from '../constants';
import { augmentProvider } from '../internal/augment-provider';
import loadCannonfile from '../internal/load-cannonfile';
import { CannonWrapperGenericProvider } from '@usecannon/builder';
import path from 'path';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addOptionalParam(
    'overrideManifest',
    'Use a different manifest file for this network deployment. NOTE: this is not reccomended for regular use, it is simply an escape hatch'
  )
  .addOptionalVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .addOptionalParam(
    'impersonate',
    'Run deployment without requiring any private keys. The value of this flag determines the default signer.'
  )
  .addFlag('writeDeployments', 'Wether to write deployment files when using the --dry-run flag')
  .setAction(async (opts, hre) => {
    if (hre.network.name === CANNON_NETWORK_NAME) {
      throw new Error(`cannot deploy to '${CANNON_NETWORK_NAME}'. Use cannon:build instead.`);
    }

    let packageDefinition: PackageDefinition;
    if (!opts.packageWithSettings) {
      // derive from the default cannonfile
      const { name, version } = loadCannonfile(hre, 'cannonfile.toml');

      packageDefinition = {
        name,
        version,
        settings: {},
      };
    } else {
      packageDefinition = (opts.packageWithSettings as string[]).reduce((result, val) => {
        return parsePackageArguments(val, result);
      }, {} as PackageDefinition);
    }

    if (!hre.network.config.chainId) {
      throw new Error('Selected network must have chainId set in hardhat configuration');
    }

    const [signer] = (await hre.ethers.getSigners()) as ethers.Signer[];

    const writeDeployments = !opts.dryRun || (opts.dryRun && opts.writeDeployments);

    // hardhat is kind of annoying when it comes to providers. When on `hardhat` network, they include a `connection`
    // object in the provider, but this connection leads to nowhere (it isn't actually exposed)
    // also, when using local network, it attempts to create its own proxy which similarly is not exposed through its reported connection.
    // so we have to do special handling to get the results we want here.

    let provider: ethers.providers.Provider;
    if (hre.network.name === 'hardhat') {
      provider = new CannonWrapperGenericProvider({}, hre.ethers.provider, false);
    } else {
      provider = new ethers.providers.JsonRpcProvider((hre.network.config as HttpNetworkConfig).url);
    }

    const { outputs } = await deploy({
      packageDefinition,
      overrideCannonfilePath: path.resolve(hre.config.paths.root, opts.overrideManifest),

      // we have to wrap the provider here because of the third argument, prevent any reading-into for the hardhat-network
      provider,

      mnemonic: (hre.network.config.accounts as HttpNetworkHDAccountsConfig).mnemonic,
      privateKey: (hre.network.config.accounts as string[])[0],
      impersonate: opts.impersonate,
      preset: opts.preset,
      dryRun: opts.dryRun,
      prefix: opts.prefix,
      cannonDirectory: hre.config.paths.cannon,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryIpfsAuthorizationHeader: hre.config.cannon.ipfsAuthorizationHeader,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
      projectDirectory: hre.config.paths.root,
      deploymentPath: writeDeployments ? hre.config.paths.deployments : '',
    });

    augmentProvider(hre, outputs);

    return { outputs, provider, signer };
  });
