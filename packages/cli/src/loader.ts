import { CannonLoader, IPFSLoader } from '@usecannon/builder';
import { compress, getContentCID } from '@usecannon/builder/dist/ipfs';
import crypto from 'crypto';
import Debug from 'debug';
import fs from 'fs-extra';
import path from 'path';
import { getCannonRepoRegistryUrl } from './constants';
import { CliSettings } from './settings';

const debug = Debug('cannon:cli:loader');

const isFile = (filepath: string) => {
  try {
    return fs.statSync(filepath).isFile();
  } catch (err: unknown) {
    return false;
  }
};

/**
 * @deprecated
 */
export class LocalLoader implements CannonLoader {
  dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  getLabel(): string {
    return `local (${this.dir})`;
  }

  read(url: string): Promise<any> {
    if (!url.startsWith('file://')) {
      throw new Error('incorrect url type');
    }

    return fs.readJson(path.join(this.dir, `${url.slice(7)}`));
  }

  async put(misc: any): Promise<string | null> {
    const dataToSave = JSON.stringify(misc);
    const hash = crypto.createHash('md5').update(dataToSave).digest('hex');

    await fs.mkdirp(this.dir);
    await fs.writeFile(path.join(this.dir, `${hash}.json`), dataToSave);

    return `file://${hash}.json`;
  }

  async list() {
    debug('local list');

    return (await fs.readdir(this.dir)).filter((f) => f.match(/[0-9a-f]+\.json/)).map((f) => `file://${f}`);
  }

  async remove(url: string) {
    debug(`local remove ${url}`);

    await fs.unlink(path.join(this.dir, `${url.slice(7)}`));
  }
}

export class CliLoader implements CannonLoader {
  ipfs?: IPFSLoader;
  repo: IPFSLoader;
  dir: string;

  constructor(ipfsLoader: IPFSLoader | undefined, repoLoader: IPFSLoader, fileCacheDir: string) {
    this.ipfs = ipfsLoader;
    this.repo = repoLoader;
    this.dir = fileCacheDir;
  }

  getLabel() {
    return this.ipfs ? this.ipfs.getLabel() : this.repo.getLabel();
  }

  getCacheFilePath(url: string) {
    return path.join(this.dir, `${CliLoader.getCacheHash(url)}.json`);
  }

  async put(misc: any): Promise<string> {
    const data = JSON.stringify(misc);

    const cid = await getContentCID(Buffer.from(compress(data)));
    const url = IPFSLoader.PREFIX + cid;

    debug(`cli ipfs put ${url}`);

    await fs.mkdirp(this.dir);
    await fs.writeFile(this.getCacheFilePath(url), data);

    if (this.ipfs) {
      await this.ipfs.put(misc);
    }

    return url;
  }

  async read(url: string) {
    debug(`cli ipfs read ${url}`);

    const cacheFile = this.getCacheFilePath(url);

    // Check if we already have the file cached locally
    if (isFile(cacheFile)) {
      return fs.readJson(cacheFile);
    }

    // If its configured, try to get it from the settings ipfs
    if (this.ipfs) {
      return this.ipfs.read(url);
    }

    // Lastly, default to the Cannon repo ipfs
    return this.repo.read(url);
  }

  async remove(url: string) {
    debug(`cli ipfs remove ${url}`);

    const cacheFile = this.getCacheFilePath(url);

    // Remove from the local cache
    if (isFile(cacheFile)) {
      await fs.unlink(cacheFile);
    }

    // If its configured, try to remove it from the settings ipfs
    if (this.ipfs) {
      return this.ipfs.remove(url);
    }

    // Notice: Never try to remove from the repo
  }

  async list() {
    return this.ipfs ? this.ipfs.list() : [];
  }

  static getCacheHash(url: string) {
    return crypto.createHash('md5').update(url.replace(IPFSLoader.PREFIX, '')).digest('hex');
  }
}

export function getMainLoader(cliSettings: CliSettings) {
  return {
    ipfs: new CliLoader(
      cliSettings.ipfsUrl ? new IPFSLoader(cliSettings.ipfsUrl) : undefined,
      new IPFSLoader(getCannonRepoRegistryUrl()),
      path.join(cliSettings.cannonDirectory, 'ipfs_cache')
    ),
    file: new LocalLoader(path.join(cliSettings.cannonDirectory, 'blobs')),
  };
}
