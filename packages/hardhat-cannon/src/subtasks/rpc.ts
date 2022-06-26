import { spawn } from 'child_process';
import { ethers } from 'ethers';

import { subtask } from 'hardhat/config';

import { SUBTASK_RPC } from '../task-names';

subtask(SUBTASK_RPC).setAction(async ({ port, forkUrl }, hre): Promise<ethers.providers.BaseProvider> => {
  const opts = ['--port', port];
  if (forkUrl) {
    opts.push('--fork-url', forkUrl);
  }
  spawn('anvil');

  return new ethers.providers.JsonRpcProvider(`http://127.0.0.1:${port}`);
});
