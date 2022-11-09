import os from 'node:os';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { DeploymentInfo, DeploymentManifest } from './types';
import _ from 'lodash';

import type { RawChainDefinition } from './definition';

import Debug from 'debug';
const debug = Debug('cannon:builder:storage');

const DEPLOY_FILE_INDENTATION = 4;

export function getSavedPackagesDir() {
  return path.join(os.homedir(), '.local', 'share', 'cannon');
}

export function getPackageDir(packagesDir: string, name: string, version: string) {
  return path.join(packagesDir, name, version);
}

export function getDeploymentInfoFile(packageDir: string) {
  return path.join(packageDir, 'deploy.json');
}

export async function getAllDeploymentInfos(packageDir: string): Promise<DeploymentManifest> {
  const file = getDeploymentInfoFile(packageDir);

  if (!fs.existsSync(file)) {
    return { deploys: {}, npmPackage: {}, misc: { ipfsHash: '' }, def: { name: '', version: '' } };
  }

  return (await fs.readJson(file)) as DeploymentManifest;
}

export async function getDeploymentInfo(packageDir: string, network: number, label: string): Promise<DeploymentInfo | null> {
  const deployInfo = await getAllDeploymentInfos(packageDir);

  return _.get(deployInfo.deploys, `${network}.${label}`, null) as unknown as DeploymentInfo | null;
}

export async function putDeploymentInfo(packageDir: string, chainId: number, label: string, info: DeploymentInfo, pkg: any) {
  const deployInfo = await getAllDeploymentInfos(packageDir);

  _.set(deployInfo.deploys, `${chainId}.${label}`, info);
  deployInfo.npmPackage = pkg;

  await fs.writeFile(getDeploymentInfoFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
}

export async function clearDeploymentInfo(packageDir: string, chainId: number, label: string) {
  // delete associated files
  const prefix = `${chainId}-${label}`;
  for (const file in fs.readdir(packageDir)) {
    if (file.startsWith(prefix)) {
      await fs.rm(path.join(packageDir, file));
    }
  }

  // delete entry in deploy file
  const deployInfo = await getAllDeploymentInfos(packageDir);
  delete deployInfo.deploys[chainId.toString()][label];
  await fs.writeFile(getDeploymentInfoFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
}

export function getActionFiles(packageDir: string, chainId: number, label: string, stepName: string) {
  const filename = `${chainId}-${label}/${stepName}`;

  const basename = path.join(packageDir, filename);

  return {
    chain: basename + '.chain',
    metadata: basename + '.json',
    basename,
  };
}

export async function exportChain(packagesDir: string, name: string, version: string): Promise<Buffer> {
  const zip = new AdmZip();

  const folder = getPackageDir(packagesDir, name, version);
  await zip.addLocalFolderPromise(folder, {});
  return zip.toBufferPromise();
}

export async function importChain(packagesDir: string, buf: Buffer): Promise<RawChainDefinition> {
  const zip = new AdmZip(buf);

  const manifest = JSON.parse(zip.readAsText('deploy.json')) as DeploymentManifest;

  // manifest determines where to store the files
  const dir = getPackageDir(packagesDir, manifest.def.name, manifest.def.version);
  await zip.extractAllTo(dir, true);

  return manifest.def;
}

export async function associateTag(packagesDir: string, name: string, version: string, tagSource: string, tag: string) {
  const mainCacheDir = getPackageDir(packagesDir, name, version);
  const tagCacheDir = getPackageDir(packagesDir, tagSource, tag);

  if (!(await fs.pathExists(mainCacheDir))) {
    throw new Error(`could not associate tag: cache dir for ${name}:${version} does not exist`);
  }

  if (version === tag) {
    return;
  }

  debug(`associate tag ${tagSource}:${tag} for ${name}:${version}`);

  await fs.mkdirp(path.dirname(tagCacheDir));

  if (fs.existsSync(tagCacheDir)) {
    const existingInfo = await fs.lstat(tagCacheDir);

    if (existingInfo.isSymbolicLink()) {
      console.log('unlink');
      await fs.unlink(tagCacheDir);
    } else if (existingInfo.isDirectory()) {
      throw new Error(
        `the directory at ${tagCacheDir} is not a symbolic link, but a tag should be associated here. If you intend to link a tag here, please delete this directory and try again.`
      );
    }
  }

  await fs.symlink(mainCacheDir, tagCacheDir);
}
