import path from 'path';
import { task } from 'hardhat/config';

import IPFS from '../builder/ipfs';
import readPackageJson from '../internal/read-package-json';
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

    const label = readPackageJson(hre).name;

    const filepath = path.resolve(hre.config.paths.root, file);
    // const { filepath, builder } = await hre.run(TASK_BUILD, {
    //   label,
    //   file,
    //   options,
    // });

    const metadata = {
      name: label,
      version: readPackageJson(hre).version,
    };

    const result = await ipfs.add([
      {
        remotePath: `${label}/cannonfile.toml`,
        localPath: filepath,
      },
      {
        remotePath: `${label}/cannon-metadata.json`,
        content: JSON.stringify(metadata, null, 2),
      },
      // {
      //   remotePath: `${label}/cache`,
      //   localPath: builder.getCacheDir(),
      // },
    ]);

    const folderHash = result
      .find((file) => file.path === label)
      ?.cid.toV0()
      .toString();

    console.log(result);
    console.log({ folderHash });
  });
