import fs from 'fs-extra';
import { Readable } from 'stream';
import { subtask } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../ipfs';
import { SUBTASK_DOWNLOAD } from '../task-names';
import { importChain, associateTag, getCacheDir } from '../builder/storage';

subtask(SUBTASK_DOWNLOAD).setAction(async ({ images }: { images: string[] }, hre) => {
  const ipfs = new IPFS(hre.config.cannon.ipfsConnection);
  const registry = new CannonRegistry({
    endpoint: hre.config.cannon.registryEndpoint,
    address: hre.config.cannon.registryAddress,
  });

  const sources = images.map((image) => image.split(':'));

  for (const [name, tag] of sources) {
    const target = getCacheDir(hre.config.paths.cache, name, tag);

    const exists = await fs
      .stat(target)
      .then((stat) => stat.isDirectory())
      .catch(() => false);

    if (exists) continue;

    const url = await registry.getUrl(name, tag);

    if (!url) {
      throw new Error(`dependency not found: ${name}:${tag}. please check that the requested package exists and try again.`);
    }

    console.log(`Downloading dependency ${name}:${tag} from ${url}`);

    const hash = url.replace(/^ipfs:\/\//, '');

    const bufs: Buffer[] = [];

    await new Promise((resolve, reject) => {
      const readable = Readable.from(ipfs.client.cat(hash));

      readable.on('data', (b) => bufs.push(b));
      readable.on('end', resolve);
      readable.on('error', reject);
    });

    const buf = Buffer.concat(bufs);

    const info = await importChain(hre, buf);

    // imported chain may be of a different version from the actual requested tag. Make sure we link if necessary
    await associateTag(hre, info.name, info.version, tag);

    console.log(`Finished import (${buf.length})`);
  }
});
