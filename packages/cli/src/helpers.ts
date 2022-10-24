import os from 'node:os';
import { exec, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import prompts from 'prompts';
import { magentaBright, yellowBright, yellow, bold, redBright, red } from 'chalk';
import toml from '@iarna/toml';
import { CANNON_CHAIN_ID, ChainDefinition, DeploymentManifest, RawChainDefinition, ChainBuilderContext } from '@usecannon/builder';
import { ChainId, ChainName } from './types';

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

export async function checkCannonVersion(currentVersion: string): Promise<void> {
  const latestVersion = await execPromise('npm view @usecannon/cli version');

  if (currentVersion !== latestVersion) {
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

export function loadCannonfile(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Cannonfile '${filepath}' not found.`);
  }

  const rawDef = toml.parse(fs.readFileSync(filepath).toString('utf8')) as RawChainDefinition;
  const def = new ChainDefinition(rawDef);
  const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));

  const ctx: ChainBuilderContext = {
    package: pkg,
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

    contracts: {},
    txns: {},
    imports: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { def, name, version };
}

export function findPackage(cannonDirectory: string, packageName: string, packageVersion: string) {
  try {
    const pathname = path.resolve(cannonDirectory, packageName, packageVersion, 'deploy.json');
    const deployFile = fs.readFileSync(pathname);
    return JSON.parse(deployFile.toString()) as DeploymentManifest;
  } catch {
    console.error(redBright(`Unable to find package ${packageName}:${packageVersion} in ${cannonDirectory}`));
    console.error(red('Download it using the run command or build it from a local cannonfile.'));
    process.exit(1);
  }
}

export function getChainName(chainId: ChainId): string {
  return ChainId[chainId] || 'unknown';
}

export function getChainId(chainName: ChainName): number {
  if (!ChainId[chainName]) throw new Error(`Invalid chain "${chainName}"`);
  return ChainId[chainName];
}
