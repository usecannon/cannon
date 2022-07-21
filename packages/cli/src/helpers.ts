import os from 'os';
import { exec, spawnSync } from 'child_process';
import prompts from 'prompts';
import { magentaBright, yellowBright, yellow, bold } from 'chalk';
import fs from 'fs';
import toml from '@iarna/toml';
import { ethers } from 'ethers';
import { validateChainDefinition } from '@usecannon/builder';

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

function execPromise(command: string): Promise<string> {
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

export interface PackageDefinition {
  name: string;
  version: string;
  settings: { [k: string]: string };
}

const packageRegExp = /^(?<name>[a-z0-9][a-z0-9-]+[a-z0-9])(?::(?<version>.+))?$/;
const settingRegExp = /^(?<key>[a-z0-9-_]+)=(?<value>.*)$/i;

export function parsePackagesArguments(val: string, result: PackageDefinition[] = []) {
  const packageMatch = val.match(packageRegExp);
  if (packageMatch) {
    const { name, version } = packageMatch.groups!;

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
    if (!result.length) throw new Error('Missing package definition before setting');
    const { key, value } = settingMatch.groups!;
    const def = result[result.length - 1];
    def.settings[key] = value;
    return result;
  }

  throw new Error(`Invalid argument given ${val}`);
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
