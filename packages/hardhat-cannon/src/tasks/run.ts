import { task } from 'hardhat/config';
import { HardhatNetworkAccountConfig, HardhatRuntimeEnvironment, HttpNetworkConfig } from 'hardhat/types';
import { run, parsePackagesArguments, runRpc, PackageSpecification } from '@usecannon/cli';
import { TASK_RUN } from '../task-names';
import loadCannonfile from '../internal/load-cannonfile';
import { isURL } from '../internal/is-url';

task(TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
  .addOptionalVariadicPositionalParam(
    'packageNames',
    'List of packages to load, optionally with custom settings for each one'
  )
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('fork', 'Fork the specified network or the given RPC url')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('fundAddresses', 'Comma separated list of addresses to receive a balance of 10,000 ETH', '')
  .addFlag('writeDeployments', 'Wether or not to write deployments data to the path.deployments folder')
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
  .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
  .setAction(async ({ packageNames, port, fork, logs, preset, writeDeployments, impersonate, fundAddresses }, hre) => {
    const packages: PackageSpecification[] = ((packageNames || []) as string[]).reduce((result, val) => {
      return parsePackagesArguments(val, result);
    }, [] as PackageSpecification[]);

    if (!packages.length) {
      // derive from the default cannonfile
      const { name, version } = loadCannonfile(hre, 'cannonfile.toml');

      packages.push({
        name,
        version,
        settings: {},
      });
    }

    const forkNetworkConfig = await _getNetworkConfig(hre, fork);

    // If its a fork, use the privateKey from the fork network config
    const networkConfig = forkNetworkConfig || hre.network.config;
    const privateKey = Array.isArray(networkConfig.accounts)
      ? _getPrivateKeyFromAccount(networkConfig.accounts[0])
      : undefined;

    const forkUrl = forkNetworkConfig?.url || fork;

    const node = await runRpc({
      port: Number.parseInt(port) || hre.config.networks.cannon.port,
      forkUrl,
    });

    let toImpersonate: string[] = [];
    if (impersonate) {
      toImpersonate = (await hre.ethers.getSigners()).map((s) => s.address);
    }

    return run(packages, {
      node,
      logs,
      preset,
      privateKey,
      writeDeployments: writeDeployments ? hre.config.paths.deployments : '',
      projectDirectory: hre.config.paths.root,
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

function _getPrivateKeyFromAccount(acc: string | HardhatNetworkAccountConfig) {
  if (typeof acc === 'string' && acc.length === 66) return acc;
  const conf = acc as HardhatNetworkAccountConfig;
  if (conf?.privateKey) return conf.privateKey;
  return undefined;
}

async function _getNetworkConfig(hre: HardhatRuntimeEnvironment, fork: string) {
  if (!fork) return undefined;

  // If the fork param is a network name, return its config
  if (hre.config.networks[fork]) return hre.config.networks[fork] as HttpNetworkConfig;

  if (!isURL(fork)) {
    throw new Error(`Invalid fork param given: ${fork}`);
  }

  // Try to get the local network config for the configured endpoint
  const forkProvider = new hre.ethers.providers.JsonRpcProvider(fork);
  const { chainId } = await forkProvider.getNetwork();

  return Object.values(hre.config.networks).find((n) => n.chainId === chainId) as HttpNetworkConfig;
}
