import fs from 'fs';
import path from 'path';
import { globSync } from 'hardhat/internal/util/glob';
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
  .setAction(async ({ file }, hre) => {
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
      privateKey: hre.config.cannon.registryPrivateKey,
    });

    console.log('Uploading files to IPFS...');

    const files = [
      {
        remotePath: `${name}/cannonfile.toml`,
        localPath: filepath,
      },
    ];

    const readmePath = path.resolve(hre.config.paths.root, 'README.md');
    if (fs.existsSync(readmePath)) {
      files.push({
        remotePath: `${name}/README.md`,
        localPath: readmePath,
      });
    }

    files.push({
      remotePath: `${name}/cache`,
      localPath: builder.getCacheDir(),
    });

    const result = await ipfs.add(files);

    const folderHash = result
      .find((file) => file.path === name)
      ?.cid.toV0()
      .toString();

    const url = `ipfs://${folderHash}`;

    console.log(`Publishing ${name}@${version} with url "${url}"`);

    await registry.publish(name, version, url);
  });
