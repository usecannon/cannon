import fs from 'node:fs/promises';
import path from 'node:path';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { task } from 'hardhat/config';

task('storage:get-legacy-store-values')
  .addPositionalParam('dataPath', 'Path to a json file with the list of packages')
  .setAction(async ({ dataPath }, hre) => {
    await hre.run(TASK_COMPILE);

    const packageNames = JSON.parse((await fs.readFile(path.resolve(dataPath))).toString());

    const StorageReader = await hre.ethers.getContractAt('StorageReader', '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba');

    for (const packageName of packageNames) {
      const name = hre.ethers.utils.formatBytes32String(packageName);
      try {
        const data = await StorageReader.getStoreData(name);
        console.log(packageName, data);
      } catch (err) {
        console.error(packageName, 'error');
      }
    }
  });
