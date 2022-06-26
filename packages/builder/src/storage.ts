import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { ChainDefinition } from './types';

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

export function getLayerFiles(chartDir: string, chainId: number, n: number) {
  const filename = `${chainId}-${n}`;

  const basename = path.join(chartDir, filename);

  return {
    cannonfile: path.join(chartDir, 'cannonfile.json'),
    chain: basename + '.chain',
    metadata: basename + '.json',
  };
}

export async function exportChain(chartsDir: string, name: string, version: string): Promise<Buffer> {
  const zip = new AdmZip();

  await zip.addLocalFolderPromise(getChartDir(chartsDir, name, version), {});

  return zip.toBufferPromise();
}

export async function importChain(chartsDir: string, buf: Buffer): Promise<ChainDefinition> {
  const zip = new AdmZip(buf);

  const manifest = JSON.parse(zip.readAsText('cannonfile.json'));

  // manifest determines where to store the files
  const cacheDir = getChartDir(chartsDir, manifest.name, manifest.version);
  await zip.extractAllTo(cacheDir, true);

  return manifest as ChainDefinition;
}

export async function associateTag(chartsDir: string, name: string, version: string, tag: string) {
  const mainCacheDir = getChartDir(chartsDir, name, version);
  const tagCacheDir = getChartDir(chartsDir, name, tag);

  if (!(await fs.pathExists(mainCacheDir))) {
    throw new Error(`could not associate tag: cache dir for ${name}:${version} does not exist`);
  }

  if (version === tag) {
    return;
  }

  if (await fs.pathExists(tagCacheDir)) {
    await fs.unlink(tagCacheDir);
  }

  await fs.symlink(mainCacheDir, tagCacheDir);
}
