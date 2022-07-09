import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { ChainDefinition, DeploymentInfo, DeploymentManifest } from './types';
import _ from 'lodash';

const DEPLOY_FILE_INDENTATION = 4;

export function getSavedChartsDir() {
  if (process.env.HOME) {
    // sane path for posix like systems
    return path.join(process.env.HOME, '.local', 'cannon');
  } else {
    // todo
    throw new Error('could not resolve cannon saved charts dir');
  }
}

export function getChartDir(chartsDir: string, name: string, version: string) {
  return path.join(chartsDir, name, version);
}

export function getDeploymentInfoFile(chartDir: string) {
  return path.join(chartDir, 'deploy.json');
}

export async function getAllDeploymentInfos(
  chartDir: string
): Promise<DeploymentManifest> {
  const file = getDeploymentInfoFile(chartDir);

  if (!fs.existsSync(file)) {
    return {
      deploys: {},
      misc: { ipfsHash: '' },
      def: { name: '', version: '' },
    };
  }

  return (await fs.readJson(file)) as DeploymentManifest;
}

export async function getDeploymentInfo(
  chartDir: string,
  network: number,
  label: string
): Promise<DeploymentInfo | null> {
  const deployInfo = await getAllDeploymentInfos(chartDir);

  return _.get(
    deployInfo.deploys,
    `${network}.${label}`,
    null
  ) as unknown as DeploymentInfo | null;
}

export async function putDeploymentInfo(
  chartDir: string,
  chainId: number,
  label: string,
  info: DeploymentInfo
) {
  const deployInfo = await getAllDeploymentInfos(chartDir);

  _.set(deployInfo.deploys, `${chainId}.${label}`, info);

  await fs.writeFile(
    getDeploymentInfoFile(chartDir),
    JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION)
  );
}

export async function clearDeploymentInfo(
  chartDir: string,
  chainId: number,
  label: string
) {
  // delete associated files
  const prefix = `${chainId}-${label}`;
  for (const file in fs.readdir(chartDir)) {
    if (file.startsWith(prefix)) {
      await fs.rm(path.join(chartDir, file));
    }
  }

  // delete entry in deploy file
  const deployInfo = await getAllDeploymentInfos(chartDir);
  delete deployInfo.deploys[chainId.toString()][label];
  await fs.writeFile(
    getDeploymentInfoFile(chartDir),
    JSON.stringify(deployInfo, null, DEPLOY_FILE_INDENTATION)
  );
}

export function getLayerFiles(
  chartDir: string,
  chainId: number,
  label: string,
  n: number
) {
  const filename = `${chainId}-${label}/${n}`;

  const basename = path.join(chartDir, filename);

  return {
    chain: basename + '.chain',
    metadata: basename + '.json',
    basename,
  };
}

export async function exportChain(
  chartsDir: string,
  name: string,
  version: string
): Promise<Buffer> {
  const zip = new AdmZip();

  const folder = getChartDir(chartsDir, name, version);
  await zip.addLocalFolderPromise(folder, {});
  return zip.toBufferPromise();
}

export async function importChain(
  chartsDir: string,
  buf: Buffer
): Promise<ChainDefinition> {
  const zip = new AdmZip(buf);

  const manifest = JSON.parse(
    zip.readAsText('deploy.json')
  ) as DeploymentManifest;

  // manifest determines where to store the files
  const dir = getChartDir(chartsDir, manifest.def.name, manifest.def.version);
  await zip.extractAllTo(dir, true);

  return manifest.def;
}

export async function associateTag(
  chartsDir: string,
  name: string,
  version: string,
  tag: string
) {
  const mainCacheDir = getChartDir(chartsDir, name, version);
  const tagCacheDir = getChartDir(chartsDir, name, tag);

  if (!(await fs.pathExists(mainCacheDir))) {
    throw new Error(
      `could not associate tag: cache dir for ${name}:${version} does not exist`
    );
  }

  if (version === tag) {
    return;
  }

  if (await fs.pathExists(tagCacheDir)) {
    await fs.unlink(tagCacheDir);
  }

  await fs.symlink(mainCacheDir, tagCacheDir);
}
