import { exec } from 'child_process';
import path from 'path';

import { existsSync, mkdirp } from 'fs-extra';
import { resolveCliSettings } from './settings';
import _ from 'lodash';

export async function installPlugin(name: string) {
  await mkdirp(getPluginDir());
  await shellExec(`npm install ${name}`);
  await shellExec(`ln -sf ${__dirname}/../../node_modules/@usecannon node_modules`);
  await shellExec(`ln -sf ${__dirname}/../../node_modules/ethers node_modules`);
}

export async function removePlugin(name: string) {
  await shellExec(`npm uninstall ${name}`);
}

export async function listInstalledPlugins() {
  if (!existsSync(getPluginDir())) {
    return [];
  }

  return Object.keys(
    _.pickBy(JSON.parse(await shellExec('npm ls --json')).dependencies, (d: any) => !d.extraneous)
  ) as string[];
}

export async function loadPlugin(name: string) {
  // read pkg to get the actual plugin load dir
  // eslint-ignore-next-line @typescript-eslint/no-var-requires
  const pkg = require(path.join(getPluginDir(), 'node_modules', name, 'package.json'));

  const loadFile = pkg.cannon || pkg.main;

  // eslint-ignore-next-line @typescript-eslint/no-var-requires
  return require(path.join(getPluginDir(), 'node_modules', name, loadFile));
}

export async function loadPlugins() {
  for (const plugin of await listInstalledPlugins()) {
    await loadPlugin(plugin);
  }
}

function getPluginDir() {
  const cliSettings = resolveCliSettings();
  return path.join(cliSettings.cannonDirectory, 'plugins');
}

function shellExec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: getPluginDir() }, (error, stdout) => {
      if (error) {
        reject(new Error(`command ${cmd} failed with error: ${error}`));
        return;
      }
      resolve(stdout);
    });
  });
}
