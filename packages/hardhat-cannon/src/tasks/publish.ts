import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { task } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../builder/ipfs';
import loadCannonfile from '../internal/load-cannonfile';
import { ChainBuilder } from '../builder';
import { TASK_PUBLISH } from '../task-names';

task(
  TASK_PUBLISH,
  'Provision and publish to the registry the current Cannonfile.toml'
)
  .addOptionalParam(
    'file',
    'TOML definition of the chain to assemble',
    'cannonfile.toml'
  )
  .addOptionalParam(
    'tags',
    'Comma separated list of labels for your package to be uploaded with.',
    'latest'
  )
  .setAction(async ({ file, tags }, hre) => {
    const filepath = path.resolve(hre.config.paths.root, file);
    const def = loadCannonfile(filepath);
    const { name, version } = def;
    const builder = new ChainBuilder({
      name,
      version,
      hre,
      def,
    });

    const ipfs = new IPFS(hre.config.cannon.ipfsConnection);
    const registry = new CannonRegistry({
      endpoint: hre.config.cannon.registryEndpoint,
      address: hre.config.cannon.registryAddress,
      privateKey: hre.config.cannon.publisherPrivateKey,
    });

    console.log('Uploading files to IPFS...');

    await fs.cp(filepath, path.join(builder.getCacheDir(), 'cannonfile.toml'));

    const readmePath = path.resolve(hre.config.paths.root, 'README.md');
    if (existsSync(readmePath)) {
      await fs.cp(readmePath, path.join(builder.getCacheDir(), 'README.md'));
    }

    const result = await ipfs.add([
      {
        remotePath: name,
        localPath: builder.getCacheDir(),
      },
    ]);

    const folderHash = result
      .find((file) => file.path === name)
      ?.cid.toV0()
      .toString();

    const url = `ipfs://${folderHash}`;

    console.log(`Publishing ${name}@${version} with url "${url}"`);

    await registry.publish(name, version, tags.split(','), url);
  });
