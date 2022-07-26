import _ from 'lodash';
import os from 'os';
import { exec, spawnSync } from 'child_process';
import prompts from 'prompts';
import { resolve } from 'path';
import { InvalidArgumentError } from 'commander';
import { magentaBright, yellowBright, yellow, bold, redBright, red } from 'chalk';
import fs from 'fs';
import toml from '@iarna/toml';
import { ethers } from 'ethers';
import { validateChainDefinition } from '@usecannon/builder';
import { PackageDefinition } from './types';

export async function setupAnvil(): Promise<void> {
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

async function getAnvilVersionDate(): Promise<Date | false> {
  try {
    const child = await spawnSync('anvil', ['--version']);
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

const packageRegExp = /^(?<name>[a-z0-9][a-z0-9-]+[a-z0-9])(?::(?<version>.+))?$/;
const settingRegExp = /^(?<key>[a-z0-9-_]+)=(?<value>.*)$/i;

export function parsePackagesArguments(val: string, result: PackageDefinition[] = []) {
  const packageMatch = val.match(packageRegExp);
  if (packageMatch) {
    const { name, version = 'latest' } = packageMatch.groups!;

    const def = {
      name,
      version,
      settings: {},
    };

    result.push(def);

    return result;
  }

  const settingMatch = val.match(settingRegExp);
  if (settingMatch) {
    if (!result.length) throw new InvalidArgumentError('Missing package definition before setting');
    const { key, value } = settingMatch.groups!;
    const def = result[result.length - 1];
    def.settings[key] = value;
    return result;
  }

  throw new InvalidArgumentError(`Invalid argument given ${val}`);
}

export function parseInteger(value: string) {
  const parsedValue = Number.parseInt(value);

  if (Number.isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }

  return parsedValue;
}

export async function checkCannonVersion(currentVersion: string): Promise<void> {
  const latestVersion = await execPromise('npm view @usecannon/cli version');

  if (currentVersion !== latestVersion) {
    console.warn(yellowBright(`⚠️ There is a new version of Cannon (${latestVersion})`));
    console.warn(yellow(`Upgrade with ${bold('npm install -g @usecannon/cli')}`));
    console.warn();
  }
}

export function loadCannonfile(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Cannonfile '${filepath}' not found.`);
  }

  const def = toml.parse(fs.readFileSync(filepath).toString('utf8'));

  let pkg: any = {};
  try {
    pkg = require(filepath.replace(new RegExp('cannonfile.toml$'), 'package.json'));
  } catch (err) {
    console.warn('package.json file not found! Cannot use field for cannonfile inference');
  }

  if (!def.name || typeof def.name !== 'string') {
    def.name = pkg.name as string;
  }

  try {
    ethers.utils.formatBytes32String(def.name);
  } catch (err) {
    let msg = 'Invalid "name" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!def.version || typeof def.version !== 'string') {
    def.version = pkg.version as string;
  }

  try {
    ethers.utils.formatBytes32String(def.version);
  } catch (err) {
    let msg = 'Invalid "version" property on cannonfile.toml. ';
    if (err instanceof Error) msg += err.message;
    throw new Error(msg);
  }

  if (!validateChainDefinition(def)) {
    console.error('cannonfile failed parse:');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const error of validateChainDefinition.errors || []) {
      console.log(`> at .${error.schemaPath}: ${error.message} (${JSON.stringify(error.params)})`);
    }

    throw new Error('failed to parse cannonfile');
  }

  return def as any;
}

export function findPackage(cannonDirectory: string, packageRef: string) {
  if (!packageRef.includes(':')) {
    packageRef += ':latest';
  }
  try {
    const path = resolve(cannonDirectory, packageRef.split(':')[0], packageRef.split(':')[1], 'deploy.json');
    const deployFile = fs.readFileSync(path);
    const jsonData = JSON.parse(deployFile.toString('utf8'));
  } catch {
    console.error(redBright(`Unable to find package ${packageRef} in ${cannonDirectory}`));
    console.error(red('Download it using the run command or build it from a local cannonfile.'));
    process.exit();
  }
  return { name: 'x', version: 'y' };
}

const chainIds: Record<number, string> = {
  0: 'kardia',
  1: 'ethereum',
  2: 'expanse',
  8: 'ubiq',
  10: 'optimism',
  19: 'songbird',
  20: 'elastos',
  25: 'cronos',
  30: 'rsk',
  40: 'telos',
  50: 'xdc',
  52: 'csc',
  55: 'zyx',
  56: 'binance',
  57: 'syscoin',
  60: 'gochain',
  61: 'ethclassic',
  66: 'okexchain',
  70: 'hoo',
  82: 'meter',
  88: 'tomochain',
  100: 'xdai',
  106: 'velas',
  108: 'thundercore',
  122: 'fuse',
  128: 'heco',
  137: 'polygon',
  200: 'xdaiarb',
  246: 'energyweb',
  250: 'fantom',
  269: 'hpb',
  288: 'boba',
  321: 'kucoin',
  336: 'shiden',
  361: 'theta',
  416: 'sx',
  534: 'candle',
  592: 'astar',
  820: 'callisto',
  888: 'wanchain',
  1088: 'metis',
  1246: 'omchain',
  1284: 'moonbeam',
  1285: 'moonriver',
  2020: 'ronin',
  2222: 'kava',
  2612: 'ezchain',
  4181: 'phi',
  4689: 'iotex',
  5050: 'xlc',
  5551: 'nahmii',
  7777: 'nmactest',
  8217: 'klaytn',
  9001: 'evmos',
  10000: 'smartbch',
  103090: 'crystaleum',
  32659: 'fusion',
  42161: 'arbitrum',
  42220: 'celo',
  42262: 'oasis',
  43114: 'avalanche',
  71402: 'godwoken',
  200625: 'akroma',
  333999: 'polis',
  1313161554: 'aurora',
  1666600000: 'harmony',
  11297108109: 'palm',
  836542336838601: 'curio',
  31337: 'hardhat',
  1337: 'localhost',
};

export function getChainName(chainId: number): string {
  return chainIds[chainId] || 'unknown';
}

export function getChainId(chainName: string): number {
  const invertedMap = _.invert(chainIds);
  return parseInt(invertedMap[chainName]);
}
