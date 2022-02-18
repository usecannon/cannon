import { task } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../builder/ipfs';
import { TASK_BUILD, TASK_PUBLISH } from '../task-names';

task(
  TASK_PUBLISH,
  'Provision and publish to the registry the current Cannonfile.toml'
)
  .addOptionalParam(
    'file',
    'TOML definition of the chain to assemble',
    'cannonfile.toml'
  )
  .addOptionalVariadicPositionalParam(
    'options',
    'Key values of chain which should be built'
  )
  .setAction(async ({ file, options }, hre) => {
    const ipfs = new IPFS();
    const registry = new CannonRegistry(hre);

    const { filepath, builder } = await hre.run(TASK_BUILD, {
      file,
      options,
    });

    const { name, version } = builder.def;

    console.log('Uploading files to IPFS...');

    const result = await ipfs.add([
      {
        remotePath: `${name}/cannonfile.toml`,
        localPath: filepath,
      },
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
