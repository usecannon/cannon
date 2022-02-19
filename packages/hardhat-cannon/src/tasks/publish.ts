import path from 'path';
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

    const ipfs = new IPFS();
    const registry = new CannonRegistry(hre);

    console.log('Uploading files to IPFS...');

    const result = await ipfs.add([
      {
        remotePath: `${name}/cannonfile.toml`,
        localPath: filepath,
      },
      // {
      //   remotePath: `${name}/README.md`,
      //   localPath: filepath,
      // },
      {
        remotePath: `${name}/cache`,
        localPath: builder.getCacheDir(),
      },
    ]);

    const folderHash = result
      .find((file) => file.path === name)
      ?.cid.toV0()
      .toString();

    const url = `ipfs://${folderHash}`;

    console.log(`Publishing ${name}@${version} with url "${url}"`);

    await registry.publish(name, version, url);
  });
