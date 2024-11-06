import toml from '@iarna/toml';
import {
  CANNON_CHAIN_ID,
  CannonRegistry,
  ChainArtifacts,
  ChainBuilderContext,
  ChainDefinition,
  ContractData,
  ContractMap,
  DeploymentInfo,
  CannonStorage,
  PackageReference,
  RawChainDefinition,
} from '@usecannon/builder';
import { AbiEvent } from 'abitype';
import { bold, magentaBright, red, yellowBright } from 'chalk';
import { exec, spawnSync } from 'child_process';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import os from 'os';
import path from 'path';
import prompts from 'prompts';
import semver from 'semver';
import * as viem from 'viem';
import { getMainLoader } from './loader';
import { privateKeyToAccount } from 'viem/accounts';
import { cannonChain, chains } from './chains';
import { resolveCliSettings } from './settings';
import { log, warn } from './util/console';
import { isConnectedToInternet } from './util/is-connected-to-internet';
import { getChainIdFromRpcUrl, isURL, hideApiKey } from './util/provider';
import { LocalRegistry } from './registry';

const debug = Debug('cannon:cli:helpers');

export function stripCredentialsFromURL(uri: string) {
  const res = new URL(uri);

  if (res.password) {
    res.password = '*'.repeat(10);
  }

  return res.toString();
}

export async function filterSettings(settings: any) {
  // Filter out private key for logging
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { cannonDirectory, privateKey, etherscanApiKey, ...filteredSettings } = settings;

  // Filters out API keys
  filteredSettings.rpcUrl = hideApiKey(filteredSettings.rpcUrl);
  filteredSettings.registryRpcUrl = hideApiKey(filteredSettings.registryRpcUrl);

  const filterUrlPassword = (uri: string) => {
    try {
      return stripCredentialsFromURL(uri);
    } catch (err) {
      debug('Invalid URL', uri);
      return '';
    }
  };

  filteredSettings.publishIpfsUrl = filterUrlPassword(filteredSettings.publishIpfsUrl!);
  filteredSettings.ipfsUrl = filterUrlPassword(filteredSettings.ipfsUrl!);
  filteredSettings.writeIpfsUrl = filterUrlPassword(filteredSettings.writeIpfsUrl!);

  return filteredSettings;
}

/**
 * Installs or upgrades Foundry to ensure compatibility with Cannon.
 *
 * This function checks the current version of Anvil (a component of Foundry) and prompts the user
 * to upgrade if necessary. If Foundry is not installed, it prompts for installation.
 *
 * @throws Will exit the process if the user declines to install or upgrade when necessary.
 * @returns {Promise<void>}
 */

export async function ensureFoundryCompatibility(): Promise<void> {
  // TODO Setup anvil using https://github.com/foundry-rs/hardhat/tree/develop/packages/easy-foundryup
  //      It also works when the necessary foundry binary is not on PATH
  const versionDate = await getAnvilVersionDate();

  if (versionDate) {
    // Confirm we have a version after https://github.com/foundry-rs/foundry/commit/8a8116977b3937ff7e871743f1805157cf242db6
    if (versionDate.getTime() < 1727051007819) {
      const anvilResponse = await prompts({
        type: 'confirm',
        name: 'confirmation',
        message: 'Cannon requires a newer version of Foundry. Install it now?',
        initial: true,
      });

      if (anvilResponse.confirmation) {
        log(magentaBright('Upgrading Foundry to the latest version...'));
        await execPromise('foundryup');
      } else {
        process.exit(1);
      }
    }
  } else {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Cannon requires Foundry. Install it now?',
      initial: true,
    });

    if (response.confirmation) {
      log(magentaBright('Installing Foundry...'));
      await execPromise('curl -L https://foundry.paradigm.xyz | bash');
      await execPromise(os.homedir() + '/.foundry/bin/foundryup');
    } else {
      process.exit();
    }
  }
}

export function getSighash(fragment: viem.AbiFunction | AbiEvent) {
  let sighash = '';

  switch (fragment.type) {
    case 'function':
      sighash = viem.toFunctionSelector(fragment);
      break;
    case 'event':
      sighash = viem.toEventSelector(fragment);
      break;
  }

  return sighash;
}

export function formatAbiFunction(v: viem.AbiFunction) {
  return `${v.type} ${v.name}(${v.inputs
    .map((param) => ` ${param.type} ${param.name}`)
    .join(',')
    .trim()})`;
}

async function getAnvilVersionDate(): Promise<Date | false> {
  try {
    const child = spawnSync('anvil', ['--version']);
    const output = child.stdout.toString();
    const timestamp = output.substring(output.indexOf('(') + 1, output.lastIndexOf(')')).split(' ')[1];
    return new Date(timestamp);
  } catch {
    return false;
  }
}

export function execPromise(command: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

export async function resolveCannonVersion(): Promise<string> {
  const settings = resolveCliSettings();
  const versionFile = settings.cannonDirectory + '/version';
  const now = Math.floor(Date.now() / 1000);
  try {
    const fileData = fs.readFileSync(versionFile).toString('utf8').split(':');
    if (parseInt(fileData[1]) >= now - 86400 * 7) {
      debug('read cannon version from file', fileData);
      return fileData[0];
    }
  } catch (err) {
    debug('could not load version file', err);
  }

  debug('downloading version from the internet');
  if (!(await isConnectedToInternet())) {
    debug('You are offline so we dont check the latest version of cannon');
    return '';
  }

  const resolvedVersion = await execPromise('npm view @usecannon/cli version');

  await fs.mkdirp(settings.cannonDirectory);
  await fs.writeFile(versionFile, `${resolvedVersion}:${now}`);

  return resolvedVersion;
}

export async function checkCannonVersion(currentVersion: string): Promise<void> {
  const latestVersion = await resolveCannonVersion();

  if (latestVersion && currentVersion && semver.lt(currentVersion, latestVersion)) {
    warn(yellowBright(`⚠️  There is a new version of Cannon (${latestVersion})`));
  }
}

function loadPackageJson(filepath: string): { name: string; version: string } {
  try {
    return require(filepath);
  } catch (_) {
    return { name: '', version: '' };
  }
}

export async function loadCannonfile(filepath: string) {
  let buf: Buffer;
  let rawDef: RawChainDefinition;

  if (filepath.endsWith('-')) {
    // credit where its due this is pretty slick
    // https://stackoverflow.com/a/56012724
    // read all data from stdin
    buf = await fs.readFile(0);

    rawDef = JSON.parse(buf.toString('utf8'));
  } else {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Cannonfile '${filepath}' not found.`);
    }

    [rawDef, buf] = (await loadChainDefinitionToml(filepath, [])) as [RawChainDefinition, Buffer];
  }

  // second argument ensures "sensitive" dependency verification--which ensures users are always specifying dependencies when they cant be reliably determined
  const def = new ChainDefinition(rawDef, true);
  const pkg = loadPackageJson(path.join(path.dirname(path.resolve(filepath)), 'package.json'));

  // TODO: there should be a helper in the builder to create the initial ctx
  const ctx: ChainBuilderContext = {
    package: pkg,
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: 0,

    contracts: {},
    txns: {},
    imports: {},
    overrideSettings: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);
  const preset = def.getPreset(ctx);

  if (!name) {
    throw new Error('missing "name" on cannon package');
  }

  if (!version) {
    throw new Error('missing "version" on cannon package');
  }

  return { def, name, version, preset, cannonfile: buf.toString() };
}

async function loadChainDefinitionToml(filepath: string, trace: string[]): Promise<[Partial<RawChainDefinition>, Buffer]> {
  if (!fs.existsSync(filepath)) {
    throw new Error(
      `Chain definition TOML '${filepath}' not found. Include trace:\n${trace.map((p) => ' => ' + p).join('\n')}`
    );
  }

  const buf = await fs.readFile(filepath);

  let rawDef: Partial<RawChainDefinition> & { include?: string[] };
  try {
    rawDef = toml.parse(buf.toString('utf8'));
  } catch (err: any) {
    throw new Error(`error encountered while parsing toml file ${filepath}: ${err.toString()}`);
  }

  const assembledDef: Partial<RawChainDefinition> = {};

  // we only want to "override" new steps with old steps. So, if we get 2 levels deep, that means we are parsing
  // a step contents, and we should just take the srcValue
  const customMerge = (_objValue: any, srcValue: any, _key: string, _object: string, _source: any, stack: any) => {
    if (stack.size === 2) {
      // cut off merge for any deeper than this
      return srcValue;
    }
  };

  for (const additionalFilepath of rawDef.include || []) {
    const abspath = path.join(path.dirname(filepath), additionalFilepath);

    _.mergeWith(assembledDef, (await loadChainDefinitionToml(abspath, [filepath].concat(trace)))[0], customMerge);
  }

  _.mergeWith(assembledDef, _.omit(rawDef, 'include'), customMerge);

  return [assembledDef, buf];
}

export function getChainName(chainId: number): string {
  return getChainDataFromId(chainId)?.name || 'unknown';
}

export function getChainId(chainName: string): number {
  if (chainName == 'cannon') return CANNON_CHAIN_ID;
  if (chainName == 'hardhat') return 31337;
  const chainData = chains.find((c: viem.Chain) => c.name === chainName);
  if (!chainData) {
    throw new Error(`Invalid chain "${chainName}"`);
  } else {
    return chainData.id;
  }
}

export function getChainDataFromId(chainId: number): viem.Chain | null {
  if (chainId == CANNON_CHAIN_ID) {
    return cannonChain;
  }

  return chains.find((c: viem.Chain) => c.id == chainId) || null;
}

export async function ensureChainIdConsistency(rpcUrl?: string, chainId?: number): Promise<void> {
  // only if both are defined
  if (rpcUrl && chainId) {
    const isRpcUrl = isURL(rpcUrl);

    if (isRpcUrl) {
      const providerChainId = await getChainIdFromRpcUrl(rpcUrl);

      // throw an expected error if the chainId is not consistent with the provider's chainId
      if (Number(chainId) !== Number(providerChainId)) {
        log(
          red(
            `Error: The chainId (${providerChainId}) obtained from the ${bold('--rpc-url')} does not match with ${bold(
              '--chain-id'
            )} value (${chainId}). Please ensure that the ${bold(
              '--chain-id'
            )} value matches the network your RPC is connected to.`
          )
        );

        process.exit(1);
      }
    }
  }
}

function getMetadataPath(packageName: string): string {
  const cliSettings = resolveCliSettings();
  return path.join(cliSettings.cannonDirectory, 'metadata_cache', `${packageName.replace(':', '_')}.json`);
}

export async function saveToMetadataCache(packageName: string, updatedMetadata: { [key: string]: string }) {
  const metadataCache = await readMetadataCache(packageName);

  // merge metadatas
  const updatedMetadataCache = {
    ...metadataCache,
    ...updatedMetadata,
  };

  // create directory if not exists
  await fs.mkdirp(path.dirname(getMetadataPath(packageName)));

  // save metadata to cache
  await fs.writeJson(getMetadataPath(packageName), updatedMetadataCache);

  // return updated metadata cache
  return updatedMetadataCache;
}

export async function readMetadataCache(packageName: string): Promise<{ [key: string]: string }> {
  try {
    return await fs.readJson(getMetadataPath(packageName));
  } catch {
    return {};
  }
}

/**
 * Extracts the contract and details from the state of a deploy package
 *
 * @param state The deploy package state
 * @returns an object containing ContractData
 *
 */

export function getContractsAndDetails(state: {
  [key: string]: { artifacts: Pick<ChainArtifacts, 'contracts'> };
}): ContractMap {
  const contractsAndDetails: { [contractName: string]: ContractData } = {};

  for (const key in state) {
    const contracts = state[key]?.artifacts?.contracts;
    if (contracts) {
      for (const contractName in contracts) {
        contractsAndDetails[contractName] = contracts[contractName];
      }
    }
  }

  return contractsAndDetails;
}

/**
 *
 * @param registries The cannon registries
 * @returns The source a cannon package is loaded from
 */
export function getSourceFromRegistry(registries: CannonRegistry[]): string | undefined {
  const prioritizedRegistry = registries[0];
  return prioritizedRegistry ? prioritizedRegistry.getLabel() : undefined;
}

/**
 * Verifies a private key is valid
 * @param privateKey The private key to verify
 * @returns boolean If the private key is valid
 */
export function isPrivateKey(privateKey: viem.Hex): boolean {
  try {
    privateKeyToAccount(privateKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Normalizes a private key
 * @param privateKey The private key to normalize
 * @returns The normalized private key
 */
export function normalizePrivateKey(privateKey: string | viem.Hex): viem.Hex {
  return (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as viem.Hex;
}

/**
 * Checks and normalizes a private key
 * @param privateKey
 * @returnsThe normalized private keys
 */
export function checkAndNormalizePrivateKey(privateKey: string | viem.Hex | undefined): viem.Hex | undefined {
  if (!privateKey) return undefined;

  const privateKeys = privateKey.split(',').map((pk) => pk.trim());

  const normalizedPrivateKeys = privateKeys.map((key: string | viem.Hex) => normalizePrivateKey(key));

  normalizedPrivateKeys.forEach((key: viem.Hex) => {
    if (!isPrivateKey(key)) {
      throw new Error(
        'Invalid private key found. Please verify the CANNON_PRIVATE_KEY environment variable, review your settings file, or check the value supplied to the --private-key flag'
      );
    }
  });

  return normalizedPrivateKeys.join(',') as viem.Hex;
}

/**
 *
 * @param packageRef The package reference, eg. name:version@preset or ipfs://<cid>
 * @returns Package Reference string
 */
export async function getPackageInfo(packageRef: string) {
  if (packageRef.startsWith('@')) {
    log(yellowBright("'@ipfs:' package reference format is deprecated, use 'ipfs://' instead"));
  }

  if (isIPFSUrl(packageRef)) {
    packageRef = normalizeIPFSUrl(packageRef);
  } else if (isIPFSCid(packageRef)) {
    packageRef = `ipfs://${packageRef}`;
  } else {
    // cant determine chainId from non-ipfs package references
    return { fullPackageRef: new PackageReference(packageRef).fullPackageRef, chainId: undefined };
  }

  const cliSettings = resolveCliSettings();

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  const storage = new CannonStorage(localRegistry, getMainLoader(cliSettings));

  try {
    const pkgInfo: DeploymentInfo = await storage.readBlob(packageRef);

    let version = pkgInfo.def.version;
    if (pkgInfo.def.version.startsWith('<%=')) {
      version = pkgInfo.meta.version;
    }

    const fullPackageRef = PackageReference.from(pkgInfo.def.name, version, pkgInfo.def.preset).fullPackageRef;

    return {
      fullPackageRef,
      chainId: Number(pkgInfo.chainId),
    };
  } catch (error: any) {
    throw new Error(error);
  }
}

export function isIPFSUrl(ref: string) {
  return ref.startsWith('ipfs://') || ref.startsWith('@ipfs:');
}

export function isIPFSCid(ref: string) {
  return ref.startsWith('Qm');
}

export function isIPFSRef(ref: string) {
  return isIPFSCid(ref) || isIPFSUrl(ref);
}

export function normalizeIPFSUrl(ref: string) {
  if (ref.startsWith('@ipfs:')) {
    return ref.replace('@ipfs:', 'ipfs://');
  }

  return ref;
}

export function getCIDfromUrl(ref: string) {
  if (!isIPFSRef(ref)) {
    throw new Error(`${ref} is not a valid IPFS url`);
  }

  if (isIPFSUrl(ref)) {
    ref = normalizeIPFSUrl(ref);
    return ref.replace('ipfs://', '');
  }

  return ref;
}
