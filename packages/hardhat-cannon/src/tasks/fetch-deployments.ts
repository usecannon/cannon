import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from 'hardhat/types';
import { PackageDefinition, fetchDeployments, parsePackagesArguments, runRpc } from '@usecannon/cli';
import { TASK_FETCH_DEPLOYMENTS } from '../task-names';
import loadCannonfile from '../internal/load-cannonfile';
import { isURL } from '../internal/is-url';

task(TASK_FETCH_DEPLOYMENTS, 'Export deployment data from a Cannon package')
  .addOptionalVariadicPositionalParam(
    'packageNames',
    'List of packages to load, optionally with custom settings for each one'
  )
  .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
  .addOptionalParam('fork', 'Fork the specified network or the given RPC url')
  .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
  .addOptionalParam('output', 'Load an alternate setting preset', './deployments')
  .setAction(async ({ packageNames, port, fork, preset, output }, hre) => {
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

    const forkNetworkConfig = await _getNetworkConfig(hre, fork);

    const forkUrl = forkNetworkConfig?.url || fork;

    const node = await runRpc({
      port: Number.parseInt(port) || hre.config.networks.cannon.port,
      forkUrl,
    });

    return fetchDeployments(packages, {
      node,
      preset,
      output,
      cannonDirectory: hre.config.paths.cannon,
      projectDirectory: hre.config.paths.root,
      registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
      registryRpcUrl: hre.config.cannon.registryEndpoint,
      registryAddress: hre.config.cannon.registryAddress,
    });
  });

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
