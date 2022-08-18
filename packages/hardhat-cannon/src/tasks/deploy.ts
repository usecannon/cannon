import { task } from 'hardhat/config';
import { deploy } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { DEFAULT_CANNON_DIRECTORY } from './constants';

task(TASK_DEPLOY, 'Deploy a cannon package to a network')
  .addPositionalParam('packageNames', 'List of packages to deploy, optionally with custom settings for each one')
  .addParam('networkRpc', 'URL of a JSON-RPC server to use for deployment')
  .addParam('privateKey', 'Private key of the wallet to use for deployment')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('cannonDirectory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
  .setAction(
    async ({ packageNames, cannonDirectory, networkRpc, privateKey, preset, prefix, writeDeployments, dryRun }, hre) => {
      await deploy({
        packageNames,
        cannonDirectory: cannonDirectory || hre.config.paths.cannon,
        projectDirectory: hre.config.paths.root,
        networkRpc,
        privateKey,
        preset,
        dryRun,
        prefix,
        deploymentPath: writeDeployments,
      });
    }
  );
