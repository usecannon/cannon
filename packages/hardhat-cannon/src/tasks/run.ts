import { task } from 'hardhat/config';
import { PackageDefinition, run, parsePackagesArguments } from '@usecannon/cli';
import { TASK_RUN } from '../task-names';
import loadCannonfile from '../internal/load-cannonfile';

task(TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
  .addOptionalVariadicPositionalParam(
    'packageNames',
    'List of packages to load, optionally with custom settings for each one'
  )
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('fork', 'Fork the network at the specified RPC url')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('fundAddresses', 'Comma separated list of addresses to receive a balance of 10,000 ETH', '')
  .addFlag('writeDeployments', 'Wether or not to write deployments data to the path.deployments folder')
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
  .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
  .setAction(async ({ packageNames, port, fork, logs, preset, writeDeployments, impersonate, fundAddresses }, hre) => {
    const packages: PackageDefinition[] = ((packageNames || []) as string[]).reduce((result, val) => {
      return parsePackagesArguments(val, result);
    }, [] as PackageDefinition[]);

    if (!packages.length) {
      // derive from the default cannonfile
      const { name, version } = loadCannonfile(hre, 'cannonfile.toml');

      packages.push({
        name,
        version,
        settings: {},
      });
    }

    const toImpersonate: string[] = [];

    if (impersonate) {
      if (Array.isArray(hre.network.config.accounts)) {
        for (const acc of hre.network.config.accounts) {
          const pKey = typeof acc === 'string' ? acc : acc.privateKey;
          if (!pKey) continue;
          if (pKey.length !== 66) {
            throw new Error('Invalid private key configured on "accounts" network config');
          }
          toImpersonate.push(new hre.ethers.Wallet(pKey).address);
        }
      }
    }

    return run(packages, {
      port,
      fork,
      logs,
      preset,
      writeDeployments: writeDeployments ? hre.config.paths.deployments : '',
      cannonDirectory: hre.config.paths.cannon,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryIpfsAuthorizationHeader: hre.config.cannon.ipfsAuthorizationHeader,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
      impersonate: toImpersonate.join(','),
      fundAddresses: fundAddresses
        .split(',')
        .filter(Boolean)
        .map((s: string) => s.trim())
        .filter(Boolean),
    });
  });
