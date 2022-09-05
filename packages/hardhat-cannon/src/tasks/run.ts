import { task } from 'hardhat/config';
import { run } from '@usecannon/cli';
import { TASK_RUN } from '../task-names';
import { parsePackagesArguments } from '@usecannon/cli/dist/src/util/params';
import { PackageDefinition } from '@usecannon/cli/dist/src/types';

task(TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
  .addVariadicPositionalParam('packageNames', 'List of packages to load, optionally with custom settings for each one')
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('fork', 'Fork the network at the specified RPC url')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('fundAddresses', 'Comma separated list of addresses to receive a balance of 10,000 ETH', '')
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
  .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
  .setAction(async ({ packageNames, port, fork, logs, preset, impersonate, fundAddresses }, hre) => {
    const packages = (packageNames as string[]).reduce((result, val) => {
      return parsePackagesArguments(val, result);
    }, [] as PackageDefinition[]);

    return run(packages, {
      port,
      fork,
      logs,
      preset,
      writeDeployments: hre.config.paths.deployments,
      cannonDirectory: hre.config.paths.cannon,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
      impersonate,
      fundAddresses: fundAddresses
        .split(',')
        .filter(Boolean)
        .map((s: string) => s.trim())
        .filter(Boolean),
    });
  });
