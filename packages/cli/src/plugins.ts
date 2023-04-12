import path from 'path';
import { exec } from 'child_process';
import _ from 'lodash';
import { existsSync, mkdirp } from 'fs-extra';
import { resolveCliSettings } from './settings';

export async function installPlugin(name: string) {
  await mkdirp(_getPluginDir());
  await _exec(`npm install ${name}`);
}

export async function removePlugin(name: string) {
  await _exec(`npm uninstall ${name}`);
}

export async function listInstalledPlugins() {
  if (!existsSync(_getPluginDir())) {
    return [];
  }

  return Object.keys(_.pickBy(JSON.parse(await _exec('npm ls --json')).dependencies, (d: any) => !d.extraneous)) as string[];
}

export async function loadPlugin(name: string) {
  const pluginFolder = path.join(_getPluginDir(), 'node_modules', name);

  // read pkg to get the actual plugin load dir
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(path.join(pluginFolder, 'package.json'));

  const pluginFile = pkg.cannon || pkg.main || '';

  return require(path.join(pluginFolder, pluginFile));
}

export async function loadPlugins() {
  for (const plugin of await listInstalledPlugins()) {
    await loadPlugin(plugin);
  }
}

function _getPluginDir() {
  const cliSettings = resolveCliSettings();
  return path.join(cliSettings.cannonDirectory, 'plugins');
}

function _exec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: _getPluginDir() }, (error, stdout) => {
      if (error) {
        reject(new Error(`command ${cmd} failed with error: ${error}`));
        return;
      }
      resolve(stdout);
    });
  });
}
