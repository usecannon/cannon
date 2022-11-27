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
import { getHardhatSigners } from '../internal/get-hardhat-signers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import prompts from 'prompts';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addOptionalParam(
    'overrideManifest',
    'Use a different manifest file for this network deployment. NOTE: this is not reccomended for regular use, it is simply an escape hatch'
  )
  .addOptionalVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addOptionalParam('writeDeployments', 'Write deployment information to the specified directory')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .addOptionalParam(
    'impersonate',
    'Run deployment without requiring any private keys. The value of this flag determines the default signer.'
  )
  .addFlag('noVerify', 'Skip verification prompt')
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

    const signers = await hre.ethers.getSigners();

    // hardhat is kind of annoying when it comes to providers. When on `hardhat` network, they include a `connection`
    // object in the provider, but this connection leads to nowhere (it isn't actually exposed)
    // also, when using local network, it attempts to create its own proxy which similarly is not exposed through its reported connection.
    // so we have to do special handling to get the results we want here.

    let provider: ethers.providers.JsonRpcProvider;
    if (hre.network.name === 'hardhat') {
      provider = new CannonWrapperGenericProvider(
        {},
        hre.ethers.provider,
        false
      ) as unknown as ethers.providers.JsonRpcProvider;

      for (const signer of getHardhatSigners(hre)) {
        const address = await signer.getAddress();
        signers.push((await provider.getSigner(address)) as unknown as SignerWithAddress);
      }
    } else {
      provider = new ethers.providers.JsonRpcProvider((hre.network.config as HttpNetworkConfig).url);
    }

    const { accounts } = hre.network.config;
    const privateKey = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : undefined;

    const { outputs } = await deploy({
      packageDefinition,
      overrideCannonfilePath: opts.overrideManifest ? path.resolve(
        hre.config.paths.root,
        opts.overrideManifest
      ) : undefined,

      // we have to wrap the provider here because of the third argument, prevent any reading-into for the hardhat-network
      provider,

      // it is sometimes necessary (and reasonable) to access different artifacts for subsequent network deployments. this allows for artifact pass-through
      getArtifact: (contractName: string) => hre.artifacts.readArtifact(contractName),

      mnemonic: (hre.network.config.accounts as HttpNetworkHDAccountsConfig).mnemonic,
      privateKey,
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
      deploymentPath: opts.writeDeployments,
    });

    augmentProvider(hre, outputs);

    if (!opts.dryRun && !opts.noVerify && hre.network.name !== 'hardhat' && hre.network.name !== 'cannon') {
      const response = await prompts({
        type: 'confirm',
        name: 'confirmation',
        message: 'Would you like to verify your deployment on Etherscan?',
        initial: true,
      });

      if (response.confirmation) {
        await hre.run('cannon:verify', {
          packageName: `${packageDefinition.name}:${packageDefinition.version}`,
          directory: hre.config.paths.cannon,
        });
      }
    }

    return { outputs, provider, signers };
  });
