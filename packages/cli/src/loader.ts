import { CannonLoader, getCannonRepoRegistryUrl, IPFSLoader } from '@usecannon/builder';
import { compress, getContentCID } from '@usecannon/builder/dist/src/ipfs';
import crypto from 'crypto';
import Debug from 'debug';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import tty from 'tty';
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
  readIpfs?: IPFSLoader;
  writeIpfs?: IPFSLoader;
  repo: IPFSLoader;
  dir: string;

  constructor(opts: {
    readIpfs: IPFSLoader | undefined;
    writeIpfs: IPFSLoader | undefined;
    repoLoader: IPFSLoader;
    fileCacheDir: string;
  }) {
    this.readIpfs = opts.readIpfs;
    this.writeIpfs = opts.writeIpfs;
    this.repo = opts.repoLoader;
    this.dir = opts.fileCacheDir;
  }

  getLabel() {
    return `cli ${
      (this.readIpfs ? 'READ ' + this.readIpfs.getLabel() + ' + ' : '') +
      (this.writeIpfs ? 'READ ' + this.writeIpfs.getLabel() + ' + ' : '') +
      'REPO ' +
      this.repo.getLabel()
    }`;
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

    if (this.writeIpfs) {
      await this.writeIpfs.put(misc);
    }

    return url;
  }

  async read(url: string) {
    const cacheFile = this.getCacheFilePath(url);
    debug(`cli ipfs read ${url} ${cacheFile}`);

    // Check if we already have the file cached locally
    if (isFile(cacheFile)) {
      const ipfsData = fs.readJson(cacheFile);
      debug('cli ipfs loaded from cache');
      return ipfsData;
    }

    // If its configured, try to get it from the settings ipfs
    const ipfsData = await (this.readIpfs || this.repo).read(url);
    await fs.mkdirp(this.dir);
    // NOTE: would be nice if we could just get the raw data here so we dont have to restringify
    const rawIpfsData = JSON.stringify(ipfsData);
    await fs.writeFile(this.getCacheFilePath(url), rawIpfsData);
    debug('wrote cache ipfs data', rawIpfsData.length);

    return ipfsData;
  }

  async remove(url: string) {
    debug(`cli ipfs remove ${url}`);

    const cacheFile = this.getCacheFilePath(url);

    // Remove from the local cache
    if (isFile(cacheFile)) {
      await fs.unlink(cacheFile);
    }

    // If its configured, try to remove it from the settings ipfs
    if (this.writeIpfs) {
      return this.writeIpfs.remove(url);
    }

    // Notice: Never try to remove from the repo
  }

  async list() {
    return this.readIpfs ? this.readIpfs.list() : [];
  }

  static getCacheHash(url: string) {
    const qmhash = url.replace(IPFSLoader.PREFIX, '');
    const md5 = crypto.createHash('md5').update(qmhash).digest('hex');
    // Whe need to add an md5 to make sure that there are not collisions,
    // And we CANNOT use directly the Qm... hash because files are not case sensitive.
    return `${md5}-${qmhash.toLowerCase()}`;
  }
}

export class IPFSLoaderWithRetries extends IPFSLoader {
  async put(misc: any): Promise<string> {
    try {
      return super.put(misc);
    } catch (err) {
      if ((err as any).code === 'RETRY_ERROR' && tty.isatty(process.stdout.fd)) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Retry?',
        });

        if (confirm.value) {
          return super.put(misc);
        }
      }
      throw err;
    }
  }

  async read(url: string) {
    try {
      return super.read(url);
    } catch (err) {
      if ((err as any).code === 'RETRY_ERROR' && tty.isatty(process.stdout.fd)) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Retry?',
        });

        if (confirm.value) {
          return super.read(url);
        }
      }
      throw err;
    }
  }
}

export function getMainLoader(cliSettings: CliSettings) {
  return {
    ipfs: new CliLoader({
      readIpfs: cliSettings.ipfsUrl
        ? new IPFSLoaderWithRetries(cliSettings.ipfsUrl, {}, cliSettings.ipfsTimeout, cliSettings.ipfsRetries)
        : undefined,
      writeIpfs: cliSettings.writeIpfsUrl
        ? new IPFSLoaderWithRetries(cliSettings.writeIpfsUrl, {}, cliSettings.ipfsTimeout, cliSettings.ipfsRetries)
        : undefined,
      repoLoader: new IPFSLoaderWithRetries(
        getCannonRepoRegistryUrl(),
        {},
        cliSettings.ipfsTimeout,
        cliSettings.ipfsRetries
      ),
      fileCacheDir: path.join(cliSettings.cannonDirectory, 'ipfs_cache'),
    }),
    file: new LocalLoader(path.join(cliSettings.cannonDirectory, 'blobs')),
  };
}
