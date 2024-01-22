import path from 'path';
import Debug from 'debug';
import { ethers } from 'ethers';

import { CannonRpcNode, getProvider, runRpc } from '../rpc';
import { PackageSpecification } from '../types';
import { CliSettings, resolveCliSettings } from '../settings';
import { getFoundryArtifact } from '../foundry';
import { filterSettings, loadCannonfile } from '../helpers';
import { createDryRunRegistry } from '../registry';
import { parseSettings } from './params';
import { pickAnvilOptions } from './anvil';
import { resolveWriteProvider } from './provider';

import { CannonWrapperGenericProvider, ChainArtifacts, ChainBuilderRuntime } from '@usecannon/builder';
import { chains } from '../chains';

const debug = Debug('cannon:cli');

/**
 * Builds the contracts defined in the cannonfile.
 * @param cannonfile Path to the cannonfile.
 * @param settings Array of setting strings for the build process.
 * @param opts Options for the build process.
 * @returns An array containing the RPC node, package specification, chain artifacts, and chain builder runtime.
 */
export async function doBuild(
  cannonfile: string,
  settings: string[],
  opts: any
): Promise<[CannonRpcNode | null, PackageSpecification, ChainArtifacts, ChainBuilderRuntime]> {
  // Set debug level
  setDebugLevel(opts);
  debug('do build called with', cannonfile, settings, filterSettings(opts));

  // If the first param is not a cannonfile, it should be parsed as settings
  cannonfile = setCannonfilePath(cannonfile, settings);

  const cannonfilePath = path.resolve(cannonfile);
  const projectDirectory = path.resolve(cannonfilePath);

  const cliSettings = resolveCliSettings(opts);

  // Set up provider
  const { provider, signers, node } = await configureProvider(opts, cliSettings);

  // Set up signers
  const { getSigner, getDefaultSigner } = await configureSigners(opts, provider, signers);

  // Prepare pre-build config
  const buildConfig = await prepareBuildConfig(
    cannonfile,
    projectDirectory,
    opts,
    settings,
    cliSettings,
    provider,
    getSigner,
    getDefaultSigner
  );

  const { build } = await import('../commands/build');

  const { outputs, runtime } = await build(buildConfig);

  return [node, buildConfig.packageDefinition, outputs, runtime];
}

/**
 * Sets the debug level based on the provided options.
 * @param opts Options to define debug level.
 */
function setDebugLevel(opts: any) {
  switch (true) {
    case opts.Vvvv:
      Debug.enable('cannon:*');
      break;
    case opts.Vvv:
      Debug.enable('cannon:builder*');
      break;
    case opts.Vv:
      Debug.enable('cannon:builder,cannon:builder:definition');
      break;
    case opts.v:
      Debug.enable('cannon:builder');
      break;
  }
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
 * In a dry run, it forks the mainnet using the specified provider.
 * @param opts Options for configuring the provider.
 * @param cliSettings CLI settings to use in provider configuration.
 * @returns An object containing the configured provider, signers, and an optional RPC node.
 */
async function configureProvider(opts: any, cliSettings: CliSettings) {
  let provider: CannonWrapperGenericProvider | undefined = undefined;
  let signers: ethers.Signer[] | undefined = undefined;

  let node: CannonRpcNode | null = null;
  let chainId: number | undefined = undefined;

  if (!opts.chainId) {
    if (!opts.providerUrl) {
      node = await runRpc({
        ...pickAnvilOptions(opts),
      });

      provider = getProvider(node);
    } else {
      const _provider = new ethers.providers.JsonRpcProvider(opts.providerUrl);
      chainId = (await _provider.getNetwork()).chainId;
    }
  } else {
    chainId = opts.chainId;

    // use default rpc url for the chain ID, skipping frame
    if (opts.privateKey && !opts.providerUrl) {
      const chainData = chains.find((chain) => Number(chain.chainId) === Number(chainId));
      if (!chainData || !chainData.rpc || chainData.rpc.length === 0) {
        throw new Error(`No RPC URL found for chain ID ${chainId}`);
      }

      cliSettings.providerUrl = chainData.rpc.join(',');
    }
  }

  if (!provider) {
    const _provider = await resolveWriteProvider(cliSettings, chainId!);
    provider = _provider.provider;
    signers = _provider.signers;
  }

  if (opts.dryRun) {
    node = await runRpc(
      {
        ...pickAnvilOptions(opts),
        chainId,
      },
      {
        forkProvider: provider.passThroughProvider as ethers.providers.JsonRpcProvider,
      }
    );

    provider = getProvider(node);
  }

  return { provider, signers, node };
}

/**
 * Configures and returns the signers for transactions. In a dry run, it impersonates a default account.
 * Otherwise, it resolves signers from the provided CLI settings.
 * @param opts Options to influence signer configuration.
 * @param chainId The chain ID for which the signers are configured.
 * @param provider The configured Ethereum provider.
 * @param signers Array of signers.
 * @returns An object containing methods to get a specific signer or the default signer.
 */
async function configureSigners(opts: any, provider: CannonWrapperGenericProvider, signers?: ethers.Signer[]) {
  let getSigner: ((address: string) => Promise<ethers.Signer>) | undefined = undefined;
  let getDefaultSigner: (() => Promise<ethers.Signer>) | undefined = undefined;

  // Early return, we don't need to configure signers
  if (!opts.chainId && !opts.providerUrl) return { getSigner, getDefaultSigner };

  if (opts.dryRun) {
    // Setup for dry run
    getDefaultSigner = async () => {
      const addr =
        signers && signers.length > 0 ? await signers[0].getAddress() : '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
      return provider.getSigner(addr);
    };
  } else {
    getSigner = async (address: string) => {
      const s = ethers.utils.getAddress(address);

      for (const signer of signers!) {
        if ((await signer.getAddress()) === s) {
          return signer;
        }
      }

      throw new Error(
        `signer not found for address ${s}. Please add the private key for this address to your command line.`
      );
    };

    getDefaultSigner = async () => signers![0];
  }

  return { getSigner, getDefaultSigner };
}

/**
 * Prepares and returns the build configuration by loading and parsing the cannonfile.
 * Sets up package specifications, artifact resolver, and other options like gas prices.
 * @param cannonfile Path to the cannonfile.
 * @param projectDirectory Directory of the project.
 * @param opts Options for the build configuration.
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
  opts: any,
  settings: string[],
  cliSettings: CliSettings,
  provider: CannonWrapperGenericProvider,
  getSigner: ((address: string) => Promise<ethers.Signer>) | undefined,
  getDefaultSigner: (() => Promise<ethers.Signer>) | undefined
) {
  const { name, version, preset, def } = await loadCannonfile(cannonfile);

  const packageSpecification = {
    name,
    version,
    preset,
    settings: parseSettings(settings),
  };

  const getArtifact = (name: string) => getFoundryArtifact(name, projectDirectory);
  const overrideResolver = opts.dryRun ? await createDryRunRegistry(cliSettings) : undefined;

  return {
    provider,
    def,
    packageDefinition: packageSpecification,
    pkgInfo: {},
    getArtifact,
    getSigner,
    getDefaultSigner,
    upgradeFrom: opts.upgradeFrom,
    presetArg: opts.preset,
    wipe: opts.wipe,
    persist: !opts.dryRun,
    overrideResolver,
    publicSourceCode: true, // TODO: foundry doesn't really have a way to specify whether the contract sources should be public or private
    providerUrl: cliSettings.providerUrl,
    writeScript: opts.writeScript,
    writeScriptFormat: opts.writeScriptFormat,
    gasPrice: opts.gasPrice,
    gasFee: opts.maxGasFee,
    priorityGasFee: opts.maxPriorityGasFee,
  };
}
