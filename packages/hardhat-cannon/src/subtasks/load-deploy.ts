import path from 'path';
import { HardhatPluginError } from 'hardhat/plugins';
import { subtask } from 'hardhat/config';

import { CannonDeploy } from '../../types';
import { SUBTASK_LOAD_DEPLOY } from '../task-names';

subtask(SUBTASK_LOAD_DEPLOY).setAction(async ({ file }, hre): Promise<CannonDeploy> => {
  const filepath = path.resolve(hre.config.paths.root, file);

  try {
    return await import(filepath);
  } catch (err: any) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
      throw new HardhatPluginError('cannon', `Deployment file '${filepath}' not found.`);
    }
    throw err;
  }
});
