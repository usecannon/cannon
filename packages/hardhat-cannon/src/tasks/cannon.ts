import { task } from 'hardhat/config';
import { TASK_CANNON } from '../task-names';

task(TASK_CANNON, 'Provision the current deploy.json file using Cannon')
  .setAction(async (_, hre) => {
    // TODO: Load deploy.json file
  });
