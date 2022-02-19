import fs from 'fs/promises';
import path from 'path';
import tar from 'tar-fs';
import { Readable } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { subtask } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../builder/ipfs';
import { SUBTASK_DOWNLOAD } from '../task-names';

subtask(SUBTASK_DOWNLOAD).setAction(
  async ({ images }: { images: string[] }, hre) => {
    const ipfs = new IPFS();
    const registry = new CannonRegistry({
      endpoint: hre.config.cannon.registryEndpoint,
      address: hre.config.cannon.registryAddress,
    });

    const sources = images.map((image) => image.split(':'));

    const entries = await Promise.all(
      sources.map(async ([name, version]) => {
        const url = await registry.getUrl(name, version);
        return { name, version, url };
      })
    );

    for (const { name, version, url } of entries) {
      console.log(`Downloading dependency ${name}@${version} from ${url}...`);

      const hash = url.replace(/^ipfs:\/\//, '');
      const temp = path.join(hre.config.paths.cache, 'cannon', name);
      const target = path.join(hre.config.paths.cache, 'cannon', name, version);

      await fs.mkdir(temp, { recursive: true });

      await new Promise((resolve, reject) => {
        const readable = Readable.from(ipfs.client.get(hash)).pipe(
          createWriteStream(`${target}.tar`)
        );

        readable.on('finish', resolve);
        readable.on('error', reject);
      });

      await fs.rm(target, { recursive: true, force: true });

      await new Promise((resolve, reject) => {
        const stream = createReadStream(`${target}.tar`).pipe(
          tar.extract(temp)
        );

        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      await fs.rename(path.join(temp, hash), target);
      await fs.rm(`${target}.tar`);
    }
  }
);
