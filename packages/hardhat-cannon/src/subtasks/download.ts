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
    const ipfs = new IPFS(hre.config.cannon.ipfsConnection);
    const registry = new CannonRegistry({
      endpoint: hre.config.cannon.registryEndpoint,
      address: hre.config.cannon.registryAddress,
    });

    const sources = images.map((image) => image.split(':'));

    for (const [name, version] of sources) {
      const target = path.join(hre.config.paths.cache, 'cannon', name, version);

      const exists = await fs
        .stat(target)
        .then((stat) => stat.isDirectory())
        .catch(() => false);

      if (exists) continue;

      const url = await registry.getUrl(name, version);

      console.log(`Downloading dependency ${name}@${version} from ${url}`);

      const hash = url.replace(/^ipfs:\/\//, '');

      const temp = path.join(hre.config.paths.cache, 'cannon', name);

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
