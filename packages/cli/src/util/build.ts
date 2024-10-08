import path from 'node:path';
import { CannonError, CannonSigner, ChainArtifacts, ChainBuilderRuntime } from '@usecannon/builder';
import Debug from 'debug';
import * as viem from 'viem';
import { PackageSpecification } from '../types';
import { getFoundryArtifact } from '../foundry';
import { ANVIL_FIRST_ADDRESS } from '../constants';
import { createDryRunRegistry } from '../registry';
import { CannonRpcNode, getProvider, runRpc } from '../rpc';
import { CliSettings, resolveCliSettings } from '../settings';
import { execPromise, filterSettings, loadCannonfile } from '../helpers';
import { warn } from './console';
import { parseSettings } from './params';
import { pickAnvilOptions } from './foundry-options';
import { setDebugLevel } from './debug-level';
import { ProviderAction, resolveProvider, isURL, getChainIdFromRpcUrl } from './provider';

import { yellow, bold, italic } from 'chalk';

const debug = Debug('cannon:cli:build');

/**
 * Builds the contracts defined in the cannonfile.
 * @param cannonfile Path to the cannonfile.
 * @param settings Array of setting strings for the build process.
 * @param options Options for the build process.
 * @returns An array containing the RPC node, package specification, chain artifacts, and chain builder runtime.
 */
export async function doBuild(
  cannonfile: string,
  settings: string[],
  options: Record<string, any>
): Promise<[CannonRpcNode | null, PackageSpecification, ChainArtifacts, ChainBuilderRuntime]> {
  // Set debug level
  setDebugLevel(options);
  debug('do build called with', cannonfile, settings, filterSettings(options));

  // If the first param is not a cannonfile, it should be parsed as settings
  cannonfile = setCannonfilePath(cannonfile, settings);

  const cannonfilePath = path.resolve(cannonfile);
  const projectDirectory = path.resolve(cannonfilePath);

  const cliSettings = resolveCliSettings(options);
  // Set up provider
  const { provider, signers, node } = await configureProvider(options, cliSettings);

  // Set up signers
  // TODO: why are the provider types borked up here (like they are everywhere)
  const { getSigner, getDefaultSigner } = await configureSigners(options, cliSettings, provider as any, signers);

  // Prepare pre-build config
  const buildConfig = await prepareBuildConfig(
    cannonfile,
    projectDirectory,
    options,
    settings,
    cliSettings,
    provider as any,
    getSigner,
    getDefaultSigner
  );

  const deployers = buildConfig.def.getDeployers();

  const defaultSigner = getDefaultSigner && (await getDefaultSigner());
  if (defaultSigner && deployers.includes(defaultSigner.address)) {
    warn(
      yellow(
        bold(
          'WARN: For proper record of version history, we reccomend including all signers for your package as part of the `deployers` configuration in your cannonfile.'
        )
      )
    );
    warn(yellow('This can be safely done after the build is finished.'));
  }

  const { build } = await import('../commands/build');

  const { outputs, runtime } = await build(buildConfig);

  return [node, buildConfig.packageDefinition, outputs, runtime];
}

/**
 * Processes the cannonfile and updates settings if necessary.
 *
 * @param {string} cannonfile - The cannonfile parameter.
 * @param {string[]} settings - The settings array to update if necessary.
 * @returns {string} The processed cannonfile.
 */
export function setCannonfilePath(cannonfile: string, settings: string[]) {
  if (cannonfile !== '-' && !cannonfile.endsWith('.toml')) {
    settings.unshift(cannonfile);
    cannonfile = 'cannonfile.toml';
  }
  return cannonfile;
}

/**
 * Configures and returns an Ethereum provider.
 * If no chain id or provider url is provided, starts a local RPC node.
 * In a dry run, it forks the network using the specified provider.
 * @param options Options for configuring the provider.
 * @param cliSettings CLI settings to use in provider configuration.
 * @returns An object containing the configured provider, signers, and an optional RPC node.
 */
async function configureProvider(options: Record<string, any>, cliSettings: CliSettings) {
  let provider: (viem.PublicClient & viem.WalletClient & viem.TestClient) | undefined = undefined;
  let signers: CannonSigner[] | undefined = undefined;

  let node: CannonRpcNode | null = null;
  let chainId: number | undefined = undefined;

  if (!options.chainId) {
    if (isURL(cliSettings.rpcUrl)) {
      chainId = await getChainIdFromRpcUrl(cliSettings.rpcUrl);
    } else {
      node = await runRpc({
        ...pickAnvilOptions(options),
      });

      chainId = node.chainId;
      provider = getProvider(node)!;
    }
  } else {
    chainId = parseInt(options.chainId);
  }

  if (!provider) {
    const _provider = await resolveProvider({
      action: options.dryRun ? ProviderAction.WriteDryRunProvider : ProviderAction.WriteProvider,
      cliSettings,
      chainId,
    });
    provider = _provider.provider as any;
    signers = _provider.signers;
  }

  if (options.dryRun) {
    node = await runRpc(
      {
        ...pickAnvilOptions(options),
        chainId,
      },
      {
        forkProvider: provider,
      }
    );

    provider = getProvider(node)!;
  }

  return { provider, signers, node };
}

/**
 * Configures and returns the signers for transactions. In a dry run, it impersonates a default account.
 * Otherwise, it resolves signers from the provided CLI settings.
 * @param options Options to influence signer configuration.
 * @param chainId The chain ID for which the signers are configured.
 * @param provider The configured Ethereum provider.
 * @param signers Array of signers.
 * @returns An object containing methods to get a specific signer or the default signer.
 */
async function configureSigners(
  options: Record<string, any>,
  cliSettings: CliSettings,
  provider: viem.PublicClient & viem.TestClient & viem.WalletClient,
  signers: CannonSigner[] | undefined
) {
  let getSigner: ((s: viem.Hex) => Promise<CannonSigner>) | undefined = undefined;
  let getDefaultSigner: (() => Promise<CannonSigner>) | undefined = undefined;

  // Early return, we don't need to configure signers
  const isRpcUrl = isURL(cliSettings.rpcUrl);

  if (!options.chainId && !isRpcUrl) return { getSigner, getDefaultSigner };

  if (options.dryRun) {
    // Setup for dry run
    getDefaultSigner = async () => {
      const addr = signers && signers.length > 0 ? signers[0].address : ANVIL_FIRST_ADDRESS;
      await provider.impersonateAccount({ address: addr });
      await provider.setBalance({ address: addr, value: viem.parseEther('10000') });
      return { address: addr, wallet: provider };
    };
  } else {
    getSigner = async (address: viem.Hex) => {
      for (const signer of signers || []) {
        if (viem.isAddressEqual(signer.address, address)) {
          return signer;
        }
      }

      throw new Error(
        `signer not found for address ${viem.getAddress(
          address
        )}. Please add the private key for this address to your command line.`
      );
    };

    getDefaultSigner = async () => signers![0];
  }

  if (await getDefaultSigner()) {
    const defaultSignerAddress = (await getDefaultSigner())!.address;

    if (!options.dryRun && options.chainId != '13370' && defaultSignerAddress === ANVIL_FIRST_ADDRESS) {
      warn(`WARNING: This build is using default anvil address ${ANVIL_FIRST_ADDRESS}`);
    }
  }

  return { getSigner, getDefaultSigner };
}

/**
 * Prepares and returns the build configuration by loading and parsing the cannonfile.
 * Sets up package specifications, artifact resolver, and other options like gas prices.
 * @param cannonfile Path to the cannonfile.
 * @param projectDirectory Directory of the project.
 * @param options Options for the build configuration.
 * @param settings Array of setting strings for the build process.
 * @param cliSettings CLI settings for the build process.
 * @param provider Configured Ethereum provider.
 * @param getSigner Function to get a specific signer.
 * @param getDefaultSigner Function to get the default signer.
 * @returns The build configuration object.
 */
async function prepareBuildConfig(
  cannonfile: string,
  projectDirectory: string,
  options: Record<string, any>,
  settings: string[],
  cliSettings: CliSettings,
  provider: viem.PublicClient,
  getSigner: ((address: viem.Hex) => Promise<CannonSigner>) | undefined,
  getDefaultSigner: (() => Promise<CannonSigner>) | undefined
) {
  const { name, version, preset, def } = await loadCannonfile(cannonfile);

  if (def.danglingDependencies.size) {
    const neededDeps = Array.from(def.danglingDependencies).map((v) => v.split(':'));
    throw new CannonError(
      `Unknown template access found. Please ensure the following references are defined:\n${neededDeps
        .map(([input, node]) => `${bold(input)} in ${italic(node)}`)
        .join('\n')}`
    );
  }

  const packageSpecification = {
    name,
    version,
    preset,
    settings: parseSettings(settings),
  };

  const pkgInfo: { [key: string]: string } = {};

  try {
    const [rawCommitHash, rawGitUrl] = await Promise.all([
      execPromise('git rev-parse HEAD'),
      execPromise('git config --get remote.origin.url'),
    ]);

    // convert ssh url to https if needed (should work in most cases)
    pkgInfo.gitUrl = rawGitUrl
      .trim()
      .replace(/^\w+@([^:]+):/, 'https://$1/')
      .replace('.git', '');
    pkgInfo.commitHash = rawCommitHash.trim();
    pkgInfo.readme = pkgInfo.gitUrl + `/blob/${rawCommitHash.trim()}/README.md`;
  } catch (err) {
    // fail silently
    debug(`Failed to populate metadata: ${err}`);
  }

  // TODO: `isPublicSourceCode` on def is not the most reliable way to
  // determine if source code should be public or not
  // ideally we find out from the runtime, which is the final source. however, its unlikely this
  // will become a problem because the runtime auto deletes any sources that may be included
  // anyway, and it requires a lot of refactoring,
  // so not refactoring this
  const getArtifact = (name: string) => getFoundryArtifact(name, projectDirectory, def.isPublicSourceCode());
  const overrideResolver = options.dryRun ? await createDryRunRegistry(cliSettings) : undefined;

  return {
    provider,
    def,
    packageDefinition: packageSpecification,
    pkgInfo,
    getArtifact,
    getSigner,
    getDefaultSigner,
    upgradeFrom: options.upgradeFrom,
    wipe: options.wipe,
    persist: !options.dryRun,
    overrideResolver,
    rpcUrl: cliSettings.rpcUrl,
    writeScript: options.writeScript,
    writeScriptFormat: options.writeScriptFormat,
    gasPrice: parseGwei(options.gasPrice),
    gasFee: parseGwei(options.maxGasFee),
    priorityGasFee: parseGwei(options.maxPriorityGasFee),
  };
}

function parseGwei(v: string | undefined): bigint | undefined {
  return v ? viem.parseGwei(v) : undefined;
}
