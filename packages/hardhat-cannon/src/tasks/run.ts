import path from 'path';

import { task } from 'hardhat/config';
import { HardhatNetworkAccountConfig, HttpNetworkConfig } from 'hardhat/types';
import { run, parsePackagesArguments, runRpc, PackageSpecification, loadCannonfile } from '@usecannon/cli';
import { TASK_RUN } from '../task-names';
import { loadPackageJson } from '../internal/load-pkg-json';
import { ethers } from 'ethers';

task(TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
  .addOptionalVariadicPositionalParam(
    'packageNames',
    'List of packages to load, optionally with custom settings for each one'
  )
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('preset', 'Load an alternate setting preset')
  .addOptionalParam('fundAddresses', 'Comma separated list of addresses to receive a balance of 10,000 ETH', '')
  .addOptionalParam('upgradeFrom', 'Perform an upgrade on existing contracts before running')
  .addOptionalParam('registryPriority', 'Whether to use local or remote registry first when resolving packages')
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
  .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
  .setAction(
    async ({ packageNames, port, logs, preset, impersonate, upgradeFrom, fundAddresses, registryPriority }, hre) => {
      const packages: PackageSpecification[] = ((packageNames || []) as string[]).reduce((result, val) => {
        return parsePackagesArguments(val, result);
      }, [] as PackageSpecification[]);

      if (!packages.length) {
        // derive from the default cannonfile
        const { name, version } = await loadCannonfile(path.join(hre.config.paths.root, 'cannonfile.toml'));

        packages.push({
          name,
          version,
          settings: {},
        });
      }

      // If its a fork, use the privateKey from the fork network config
      const networkConfig =
        hre.network.name !== 'hardhat' ? (hre.network.config as HttpNetworkConfig) : { url: undefined, chainId: undefined };
      const privateKey = Array.isArray(hre.network.config.accounts)
        ? _getPrivateKeyFromAccount(hre.network.config.accounts[0])
        : undefined;

      const node =
        hre.network.name === 'cannon' || hre.network.name === 'hardhat'
          ? await runRpc({
              port: Number.parseInt(port) || hre.config.networks.cannon.port,
            })
          : await runRpc(
              {
                port: Number.parseInt(port) || hre.config.networks.cannon.port,
                chainId: networkConfig.chainId,
              },
              { forkProvider: new ethers.providers.JsonRpcProvider(networkConfig.url) }
            );

      let toImpersonate: string[] = [];
      if (impersonate) {
        toImpersonate = (await hre.ethers.getSigners()).map((s) => s.address);
      }

      return run(packages, {
        node,
        logs,
        preset,
        upgradeFrom,
        registryPriority,
        getArtifact: (contractName: string) => hre.artifacts.readArtifact(contractName),
        pkgInfo: loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
        privateKey,
        impersonate: toImpersonate.join(','),
        fundAddresses: fundAddresses
          .split(',')
          .filter(Boolean)
          .map((s: string) => s.trim())
          .filter(Boolean),
      });
    }
  );

function _getPrivateKeyFromAccount(acc: string | HardhatNetworkAccountConfig) {
  if (typeof acc === 'string' && acc.length === 66) return acc;
  const conf = acc as HardhatNetworkAccountConfig;
  if (conf?.privateKey) return conf.privateKey;
  return undefined;
}
