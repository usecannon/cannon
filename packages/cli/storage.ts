import os from 'node:os';
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { ChainBuilderRuntime, DeploymentInfo, DeploymentManifest, IPFSChainBuilderRuntime } from '@usecannon/builder';
import _ from 'lodash';

import Debug from 'debug';
const debug = Debug('cannon:builder:storage');

const DEPLOY_FILE_INDENTATION = 4;

const DEFAULT_STORAGE_DIR = path.join(os.homedir(), '.local', 'share', 'cannon');

export class LegacyStorageChainBuilderRuntime extends IPFSChainBuilderRuntime {
  storageDir: string;

  constructor(storageDir = DEFAULT_STORAGE_DIR) {
    super();

    this.storageDir = storageDir;
  }

  getPackageDir(packagesDir: string, name: string, version: string) {
    return path.join(packagesDir, name, version);
  }

  getDeploymentManifestFile(packageDir: string) {
    return path.join(packageDir, 'deploy.json');
  }

  async putDeploymentInfo(packagechainId: number, label: string, info: DeploymentInfo, pkg: any) {
    const deployInfo = await getAllDeploymentManifest(packageDir);

    _.set(deployInfo.deploys, `${chainId}.${label}`, info);
    deployInfo.npmPackage = pkg;

    await fs.writeFile(this.getDeploymentManifestFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
  }

  async associateTag(packagesDir: string, name: string, version: string, tagSource: string, tag: string) {
    const mainCacheDir = this.getPackageDir(packagesDir, name, version);
    const tagCacheDir = this.getPackageDir(packagesDir, tagSource, tag);

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
        await fs.unlink(tagCacheDir);
      } else if (existingInfo.isDirectory()) {
        throw new Error(
          `the directory at ${tagCacheDir} is not a symbolic link, but a tag should be associated here. If you intend to link a tag here, please delete this directory and try again.`
        );
      }
    }

    await fs.symlink(mainCacheDir, tagCacheDir);
  }

  async readDeploy(packageName: string, preset: string): Promise<DeploymentInfo> {
    throw new Error('not implemented');
  }

  async putDeploy(deployInfo: DeploymentInfo): Promise<string> {
    throw new Error('not implemented');
  }
}

export async function getAllDeploymentManifest(packageDir: string): Promise<DeploymentManifest> {
  const file = getDeploymentManifestFile(packageDir);

  if (!fs.existsSync(file)) {
    return { deploys: {}, npmPackage: {}, misc: { ipfsHash: '' }, def: { name: '', version: '' } };
  }

  return (await fs.readJson(file)) as DeploymentManifest;
}

export async function patchDeploymentManifest(packageDir: string, updatedManifest: Partial<DeploymentManifest>) {
  const manifest = await getAllDeploymentManifest(packageDir);
  _.assign(manifest, updatedManifest);
  await fs.writeFile(getDeploymentManifestFile(packageDir), JSON.stringify(manifest, null, DEPLOY_FILE_INDENTATION));
}

export async function getDeploymentInfo(packageDir: string, network: number, label: string): Promise<DeploymentInfo | null> {
  const deployInfo = await getAllDeploymentManifest(packageDir);

  return _.get(deployInfo.deploys, `${network}.${label}`, null) as unknown as DeploymentInfo | null;
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
  const deployInfo = await getAllDeploymentManifest(packageDir);
  delete deployInfo.deploys[chainId.toString()][label];
  await fs.writeFile(getDeploymentManifestFile(packageDir), JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION));
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