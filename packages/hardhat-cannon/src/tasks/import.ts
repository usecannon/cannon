import fs from 'fs-extra';
import { task } from 'hardhat/config';

import { TASK_IMPORT } from '../task-names';
import { importChain } from '@usecannon/builder';
import { setupAnvil } from '@usecannon/helpers';

task(TASK_IMPORT, 'Read a cannon chain from zip archive')
  .addPositionalParam('file', 'Path to archive previously exported with cannon:export')
  .setAction(async ({ file }, hre) => {
    await setupAnvil();

    const info = await importChain(hre.config.paths.cannon, await fs.readFile(file));
    console.log(`Imported ${info.name}@${info.version}`);
  });
