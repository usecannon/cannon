import fs from 'fs-extra';
import { task } from 'hardhat/config';

import { TASK_EXPORT } from '../task-names';
import { exportChain } from '@usecannon/builder';
import loadCannonfile from '../internal/load-cannonfile';
import path from 'path';

task(TASK_EXPORT, 'Write a cannon chain from zip archive')
  .addOptionalParam(
    'chainName',
    'Name of cannon chain to export. By default, export the chain associated with the cannonfile at the default path.'
  )
  .addOptionalParam(
    'chainVersion',
    'Version of cannon chain to export. By default, export the chain version associated with the cannonfile at the default path.'
  )
  .addPositionalParam('file', 'Path to archive previously exported with cannon:export')
  .setAction(async ({ file, chainName, chainVersion }, hre) => {
    // if name, version not specified, resolve from cannonfile
    if (!chainName || !chainVersion) {
      const def = loadCannonfile(hre, path.join(hre.config.paths.root, 'cannonfile.toml'));
      chainName = def.name;
      chainVersion = def.version;
    }

    const buf = await exportChain(hre.config.paths.cannon, chainName, chainVersion);
    await fs.writeFile(file, buf);
    console.log(`Exported ${chainName}@${chainVersion}`);
  });
