import { task } from 'hardhat/config';
import { deploy, PackageDefinition } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { parsePackageArguments } from '@usecannon/cli/dist/src/util/params';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .setAction(async (opts, hre) => {
    const packageDefinition = (opts.packageWithSettings as string[]).reduce((result, val) => {
      return parsePackageArguments(val, result);
    }, {} as PackageDefinition);

    const [signer] = await hre.ethers.getSigners();

    await deploy({
      packageDefinition,
      provider: hre.ethers.provider,
      signer,
      preset: opts.preset,
      dryRun: opts.dryRun,
      prefix: opts.prefix,
      cannonDirectory: hre.config.paths.cannon,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
      projectDirectory: hre.config.paths.root,
      deploymentPath: hre.config.paths.deployments,
    });
  });
