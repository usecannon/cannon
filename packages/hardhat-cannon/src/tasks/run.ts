import { task } from 'hardhat/config';
import { run } from '@usecannon/cli';
import { TASK_RUN } from '../task-names';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from '@usecannon/cli/dist/src/constants';
import { parsePackagesArguments } from '@usecannon/cli/dist/src/util/params';
import { PackageDefinition } from '@usecannon/cli/dist/src/types';

task(TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
  .addVariadicPositionalParam('packageNames', 'List of packages to load, optionally with custom settings for each one')
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('fork', 'Fork the network at the specified RPC url')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('writeDeployments', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .addOptionalParam('cannonDirectory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .addOptionalParam(
    'registryIpfsUrl',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .addOptionalParam('registryRpcUrl', 'Network endpoint for interacting with the registry', DEFAULT_REGISTRY_ENDPOINT)
  .addOptionalParam('registryAddress', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .addOptionalVariadicPositionalParam('fundAddresses', 'Pass a list of addresses to receive a balance of 10,000 ETH')
  .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
  .setAction(
    async ({
      packageNames,
      port,
      fork,
      logs,
      preset,
      writeDeployments,
      cannonDirectory,
      registryIpfsUrl,
      registryRpcUrl,
      registryAddress,
      impersonate,
      fundAddresses,
    }) => {
      const packages = (packageNames as string[]).reduce((result, val) => {
        return parsePackagesArguments(val, result);
      }, [] as PackageDefinition[]);

      return run(packages, {
        port,
        fork,
        logs,
        preset,
        writeDeployments,
        cannonDirectory,
        registryIpfsUrl,
        registryRpcUrl,
        registryAddress,
        impersonate,
        fundAddresses,
      });
    }
  );
