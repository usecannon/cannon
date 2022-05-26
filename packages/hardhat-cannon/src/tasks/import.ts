import fs from 'fs-extra';
import { task } from 'hardhat/config';

import { TASK_IMPORT } from '../task-names';
import { importChain } from '../builder/storage';

task(TASK_IMPORT, 'Read a cannon chain from zip archive')
  .addPositionalParam('file', 'Path to archive previously exported with cannon:export')
  .setAction(async ({ file }, hre) => {
    const info = await importChain(hre, await fs.readFile(file));
    console.log(`Imported ${info.name}@${info.version}`);
  });
