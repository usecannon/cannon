import { exec } from 'child_process';
import path from 'path';

import { existsSync, mkdirp } from 'fs-extra';
import { resolveCliSettings } from './settings';
import _ from 'lodash';

export async function installPlugin(name: string) {
  await mkdirp(getPluginDir());

  // now install the dependency the user asked for
  await shellExec(`npm install ${name}`);

  // link our own @usecannon directory and ethers, needed for proper plugin hooking and etc.
  await linkPluginsDependencies();
}

export async function removePlugin(name: string) {
  await shellExec(`npm uninstall ${name}`);

  // link our own @usecannon directory and ethers, needed for proper plugin hooking and etc.
  await linkPluginsDependencies();
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
  /* eslint-disable @typescript-eslint/no-var-requires */
  const pkg = require(path.join(getPluginDir(), 'node_modules', name, 'package.json'));

  const loadFile = pkg.cannon || pkg.main;

  return require(path.join(getPluginDir(), 'node_modules', name, loadFile));
}

export async function loadPlugins() {
  for (const plugin of await listInstalledPlugins()) {
    await loadPlugin(plugin);
  }
}

async function linkPluginsDependencies() {
  await shellExec(`npm link ${resolveLocalDirname(`${__dirname}/..`)}`);
  await shellExec(`npm link ${resolveLocalDirname('@usecannon/builder')}`);
  await shellExec(`npm link ${resolveLocalDirname('ethers')}`);
}

function resolveLocalDirname(packageName: string) {
  return path.resolve(path.dirname(require.resolve(`${packageName}/package.json`)));
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
