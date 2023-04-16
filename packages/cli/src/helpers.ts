import os from 'node:os';
import { exec, spawnSync } from 'node:child_process';
import path from 'node:path';
import _ from 'lodash';
import fs from 'fs-extra';
import prompts, { PromptObject } from 'prompts';
import { magentaBright, yellowBright, yellow, bold } from 'chalk';
import toml from '@iarna/toml';
import { CANNON_CHAIN_ID, ChainDefinition, RawChainDefinition, ChainBuilderContext } from '@usecannon/builder';
import { chains } from './chains';
import { IChainData } from './types';
import { resolveCliSettings } from './settings';
import { Params as BuildParams } from './commands/build';

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

export async function loadCannonfile(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Cannonfile '${filepath}' not found.`);
  }

  const [rawDef, buf] = await loadChainDefinitionToml(filepath, []);
  const def = new ChainDefinition(rawDef as RawChainDefinition);
  const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));

  const ctx: ChainBuilderContext = {
    package: pkg,
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

    contracts: {},
    txns: {},
    imports: {},
    extras: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { def, name, version, cannonfile: buf.toString() };
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
  const chainData = chains.find((c: IChainData) => c.name == chainName);
  if (!chainData) {
    throw new Error(`Invalid chain "${chainName}"`);
  } else {
    return chainData.chainId;
  }
}

export function getChainDataFromId(chainId: number): IChainData | null {
  if (chainId == CANNON_CHAIN_ID) {
    return {
      name: 'cannon',
      chainId: CANNON_CHAIN_ID,
      shortName: 'eth',
      chain: 'ETH',
      network: 'local',
      networkId: CANNON_CHAIN_ID,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpc: ['http://127.0.0.1'],
      faucets: [],
      infoURL: 'https://usecannon.com',
    };
  }
  if (chainId == 31337) {
    return {
      name: 'hardhat',
      chainId: 31337,
      shortName: 'eth',
      chain: 'ETH',
      network: 'local',
      networkId: 31337,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpc: ['http://127.0.0.1'],
      faucets: [],
      infoURL: 'https://hardhat.org',
    };
  }
  return chains.find((c: IChainData) => c.chainId == chainId) || null;
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

export async function interactiveBuild(
  cannonfile: string,
  settings: JSON,
  opts: BuildParams
): Promise<{ settings: JSON; opts: BuildParams }> {
  console.log(
    `The build command will take CANNONFILE.TOML and create a package NAME:VERSION based on the resulting deployment.`
  );

  const questions: PromptObject[] = [
    {
      type: 'toggle',
      name: 'remoteNetwork',
      message: 'Are you planning to run the build on a remote network?',
      initial: false,
      active: 'Yes',
      inactive: 'No',
    },
    {
      type: (prev) => (prev ? 'text' : null),
      name: 'providerUrl',
      message: 'Enter the RPC endpoint for the network you’d like to deploy to:',
      //initial: opts.provider?.connection.url,
    },
    {
      type: (prev) => (prev ? 'number' : null),
      name: 'chainId',
      message: 'Enter the chain ID for the network you’d like to deploy to:',
      initial: opts.chainId,
    },
    {
      type: (prev) => (prev ? 'toggle' : null),
      name: 'dryRun',
      message: 'Would you like to run a simulation instead of executing the deplyoment for real?',
      initial: false,
      active: 'Yes',
      inactive: 'No',
    },
    {
      type: (prev, values) => (values.remoteNetwork ? 'toggle' : null),
      name: 'privateKey',
      message: 'Enter the private key for the account you’d like to use for deployment (This key will not be stored):',
    },
    {
      type: 'confirm',
      name: 'overrideSettings',
      message: 'Would you like to override any default settings in your cannonfile?',
      initial: false,
    },
    {
      type: (prev) => (prev ? 'text' : null),
      name: 'packageDefinitionSettings',
      message: 'Enter the new settings as a JSON object:',
      //initial: opts.packageDefinition.settings?.toString(),
    },
    {
      type: 'text',
      name: 'preset',
      message: 'Enter the preset name (use "main" for default deployments):',
      initial: opts.preset,
    },
    {
      type: 'text',
      name: 'upgradeFrom',
      message: 'Enter the package name and version this is an upgrade from, or leave blank if not an upgrade:',
      initial: opts.upgradeFrom,
    },
    {
      type: 'toggle',
      name: 'publicSourceCode',
      message:
        'Would you like to include your source code in the Cannon package? This will allow people to interact with the deployment on usecannon.com and later verify the package on etherscan',
      initial: opts.publicSourceCode,
      active: 'Yes',
      inactive: 'No',
    },
  ];
  const answers = await prompts(questions);

  return {
    settings,
    opts: {
      ...opts,
      // provider: new ethers.providers.JsonRpcProvider(answers.providerUrl),
      cannonfilePath: answers.cannonfilePath,
      packageDefinition: {
        ...opts.packageDefinition,
        settings: answers.overrideSettings ? JSON.parse(answers.packageDefinitionSettings) : opts.packageDefinition.settings,
      },
      upgradeFrom: answers.upgradeFrom,
      preset: answers.preset,
      chainId: answers.chainId,
      publicSourceCode: answers.publicSourceCode,
    },
  };
}
