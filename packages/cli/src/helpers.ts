import { exec, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import toml from '@iarna/toml';
import {
  CANNON_CHAIN_ID,
  CannonRegistry,
  ChainArtifacts,
  ChainBuilderContext,
  ChainDefinition,
  ContractData,
  ContractMap,
  RawChainDefinition,
} from '@usecannon/builder';
import { AbiEvent } from 'abitype';
import { bold, magentaBright, red, yellow, yellowBright } from 'chalk';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import prompts from 'prompts';
import semver from 'semver';
import * as viem from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { cannonChain, chains } from './chains';
import { resolveCliSettings } from './settings';
import { isConnectedToInternet } from './util/is-connected-to-internet';

const debug = Debug('cannon:cli:helpers');

export async function filterSettings(settings: any) {
  // Filter out private key for logging
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { cannonDirectory, privateKey, etherscanApiKey, ...filteredSettings } = settings;

  // Filters out API keys
  filteredSettings.providerUrl = filteredSettings.providerUrl?.replace(RegExp(/[=A-Za-z0-9_-]{32,}/), '*'.repeat(32));
  filteredSettings.registryProviderUrl = filteredSettings.registryProviderUrl?.replace(
    RegExp(/[=A-Za-z0-9_-]{32,}/),
    '*'.repeat(32)
  );
  filteredSettings.publishIpfsUrl = filteredSettings.publishIpfsUrl?.replace(RegExp(/[=AZa-z0-9_-]{32,}/), '*'.repeat(32));
  filteredSettings.ipfsUrl = filteredSettings.ipfsUrl?.replace(RegExp(/[=AZa-z0-9_-]{32,}/), '*'.repeat(32));

  return filteredSettings;
}

export async function setupAnvil(): Promise<void> {
  // TODO Setup anvil using https://github.com/foundry-rs/hardhat/tree/develop/packages/easy-foundryup
  //      It also works when the necessary foundry binary is not on PATH
  const versionDate = await getAnvilVersionDate();

  if (versionDate) {
    // Confirm we have a version after the anvil_loadState/anvil_dumpState functionality was added.
    if (versionDate.getTime() < 1657679573421) {
      const anvilResponse = await prompts({
        type: 'confirm',
        name: 'confirmation',
        message: 'Cannon requires a newer version of Foundry. Install it now?',
        initial: true,
      });

      if (anvilResponse.confirmation) {
        console.log(magentaBright('Upgrading Foundry to the latest version...'));
        await execPromise('foundryup');
      } else {
        process.exit();
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
      console.log(magentaBright('Installing Foundry...'));
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
    console.warn(yellowBright(`⚠️  There is a new version of Cannon (${latestVersion})`));
    console.warn(yellow('Upgrade with ' + bold('npm install -g @usecannon/cli\n')));
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

  const ctx: ChainBuilderContext = {
    package: pkg,
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

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

/**
 * Forge added a breaking change where it stopped returning the ast on build artifacts,
 * and the user has to add the `--ast` param to have them included.
 * This check is so we make sure to have asts regardless the user's foundry version.
 * Ref: https://github.com/foundry-rs/foundry/pull/7197
 */
export async function checkForgeAstSupport() {
  try {
    const result = await execPromise('forge build --help');
    return result.toString().includes('--ast');
  } catch (error) {
    throw new Error('Could not determine if forge ast flag is available');
  }
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

export async function ensureChainIdConsistency(providerUrl?: string, chainId?: number): Promise<void> {
  // only if both are defined
  if (providerUrl && chainId) {
    const provider = viem.createPublicClient({
      transport: viem.http(providerUrl),
    });

    const providerChainId = await provider.getChainId();

    // throw an expected error if the chainId is not consistent with the provider's chainId
    if (Number(chainId) !== Number(providerChainId)) {
      console.log(
        red(
          `Error: The chainId (${providerChainId}) obtained from the ${bold('--provider-url')} does not match with ${bold(
            '--chain-id'
          )} value (${chainId}). Please ensure that the ${bold(
            '--chain-id'
          )} value matches the network your provider is connected to.`
        )
      );

      process.exit(1);
    }
  }
}

function getMetadataPath(packageName: string): string {
  const cliSettings = resolveCliSettings();
  return path.join(cliSettings.cannonDirectory, 'metadata_cache', `${packageName.replace(':', '_')}.txt`);
}

export async function saveToMetadataCache(packageName: string, key: string, value: string) {
  const metadataCache = await readMetadataCache(packageName);
  metadataCache[key] = value;
  await fs.mkdirp(path.dirname(getMetadataPath(packageName)));
  await fs.writeJson(getMetadataPath(packageName), metadataCache);
}

export async function readMetadataCache(packageName: string): Promise<{ [key: string]: string }> {
  try {
    return await fs.readJson(getMetadataPath(packageName));
  } catch {
    return {};
  }
}

/**
 * Converts a camelCase string to a flag case string.
 *
 * @param key The camelCase string.
 * @returns The flag case string.
 */
export function toFlagCase(key: string) {
  return `--${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
}

/**
 * Converts an object of options to an array of command line arguments.
 *
 * @param options The options object.
 * @returns The command line arguments.
 */
export function toArgs(options: { [key: string]: string | boolean | number | bigint | undefined }) {
  return Object.entries(options).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }

    const flag = toFlagCase(key);

    if (value === false) {
      return [];
    } else if (value === true) {
      return [flag];
    }

    const stringified = value.toString();
    if (stringified === '') {
      return [flag];
    }

    return [flag, stringified];
  });
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
export function isPrivateKey(privateKey: viem.Hex) {
  try {
    privateKeyToAccount(privateKey);
    return true;
  } catch (e) {
    return false;
  }
}
