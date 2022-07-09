import fs from 'fs-extra';
import { task } from 'hardhat/config';

import { TASK_EXPORT } from '../task-names';
import { exportChain } from '@usecannon/builder';
import loadCannonfile from '../internal/load-cannonfile';
import path from 'path';

task(TASK_EXPORT, 'Write a cannon chain from zip archive')
  .addOptionalParam(
    'packageName',
    'Name of cannon chain to export. By default, export the chain associated with the cannonfile at the default path.'
  )
  .addOptionalParam(
    'packageVersion',
    'Version of cannon chain to export. By default, export the chain version associated with the cannonfile at the default path.'
  )
  .addOptionalParam('chainLabel', 'Name of the chain to export as it appears in hardhat. For example `mainnet` for mainnet.')
  .addOptionalParam('preset', 'Preset to export. Defaults to `main`', 'main')
  .addPositionalParam('file', 'Path to archive previously exported with cannon:export')
  .setAction(async ({ file, packageName, packageVersion, chainLabel, preset }, hre) => {
    // if name, version not specified, resolve from cannonfile
    if (!packageName || !packageVersion) {
      const def = loadCannonfile(hre, path.join(hre.config.paths.root, 'cannonfile.toml'));
      packageName = def.name;
      packageVersion = def.version;
    }

    let chainId = 31337;
    if (chainLabel) {
      const newChainId = hre.config.networks[chainLabel].chainId;

      if (!newChainId) {
        throw new Error(`chain id for requested network ${chainLabel} not defined in hardhat configuration.`);
      }

      chainId = newChainId;
    }

    const buf = await exportChain(hre.config.paths.cannon, packageName, packageVersion);
    await fs.writeFile(file, buf);
    console.log(`Exported ${packageName}@${packageVersion} for network ${chainId}`);
  });
