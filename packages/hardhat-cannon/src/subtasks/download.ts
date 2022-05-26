import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import { subtask } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../ipfs';
import { SUBTASK_DOWNLOAD } from '../task-names';
import { importChain } from '../builder/storage';

subtask(SUBTASK_DOWNLOAD).setAction(async ({ images }: { images: string[] }, hre) => {
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

    const bufs: Buffer[] = [];

    await new Promise((resolve, reject) => {
      const readable = Readable.from(ipfs.client.cat(hash));

      readable.on('data', (b) => bufs.push(b));
      readable.on('end', resolve);
      readable.on('error', reject);
    });

    const buf = Buffer.concat(bufs);

    await importChain(hre, buf);

    console.log(`Finished import (${buf.length})`);
  }
});
