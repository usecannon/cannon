import path from 'path';
import AdmZip from 'adm-zip';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ChainDefinition } from './types';

export function getCacheDir(cacheFolder: string, name: string, version: string) {
  return path.join(cacheFolder, 'cannon', name, version);
}

export function getLayerFiles(cacheDir: string, chainId: number, n: number) {
  const filename = `${chainId}-${n}`;

  const basename = path.join(cacheDir, filename);

  return {
    cannonfile: path.join(cacheDir, 'cannonfile.json'),
    chain: basename + '.chain',
    metadata: basename + '.json',
  };
}

export async function exportChain(hre: HardhatRuntimeEnvironment, name: string, version: string): Promise<Buffer> {
  const zip = new AdmZip();

  await zip.addLocalFolderPromise(getCacheDir(hre.config.paths.cache, name, version), {});
  zip.addLocalFile(path.join(hre.config.paths.root, 'README.md'));
  zip.addLocalFile(path.join(hre.config.paths.root, 'cannonfile.toml'));

  return zip.toBufferPromise();
}

export async function importChain(hre: HardhatRuntimeEnvironment, buf: Buffer): Promise<ChainDefinition> {
  const zip = new AdmZip(buf);

  const manifest = JSON.parse(zip.readAsText('cannonfile.json'));

  // manifest determines where to store the files
  const cacheDir = getCacheDir(hre.config.paths.cache, manifest.name, manifest.version);
  await zip.extractAllTo(cacheDir, true);

  return manifest as ChainDefinition;
}
