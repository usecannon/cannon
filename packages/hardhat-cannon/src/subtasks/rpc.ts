import { spawn } from 'child_process';
import { ethers } from 'ethers';

import { subtask } from 'hardhat/config';
import { reject } from 'lodash';

import Debug from 'debug';

const debug = Debug('cannon:hardhat:rpc');

import { SUBTASK_RPC } from '../task-names';

const ANVIL_START_TIMEOUT = 3000;

subtask(SUBTASK_RPC).setAction(({ port, forkUrl }): Promise<ethers.providers.JsonRpcProvider> => {
  const opts = ['--port', port];

  // reduce image size by not creating unnecessary accounts
  opts.push('--accounts', '1');

  if (forkUrl) {
    opts.push('--fork-url', forkUrl);
  }

  return Promise.race<Promise<ethers.providers.JsonRpcProvider>>([
    new Promise<ethers.providers.JsonRpcProvider>((resolve, reject) => {
      const anvilInstance = spawn('anvil', opts);

      process.on('exit', () => anvilInstance.kill());

      let state: 'spawning' | 'running' | 'listening' = 'spawning';

      anvilInstance.on('spawn', () => {
        state = 'running';
      });

      anvilInstance.on('error', (err) => {
        if (state == 'spawning') {
          reject(
            new Error(`Anvil failed to start: ${err}

Though it is not necessary for your hardhat project, Foundry is required to use Cannon. 

Ensure you have foundry and anvil installed by running the following commands:

curl -L https://foundry.paradigm.xyz | bash
foundryup

For more info, see https://book.getfoundry.sh/getting-started/installation.html
          `)
          );
        }
      });

      anvilInstance.stdout.on('data', (rawChunk) => {
        // right now check for expected output string to connect to node
        const chunk = rawChunk.toString('utf8');
        const m = chunk.match(/Listening on (.*)/);
        if (m) {
          const host = 'http://' + m[1];
          state = 'listening';
          console.log('anvil spawned at', host);
          resolve(new ethers.providers.JsonRpcProvider(host));
        }

        debug(chunk);
      });

      anvilInstance.stderr.on('data', (rawChunk) => {
        const chunk = rawChunk.toString('utf8');
        console.error(chunk.split('\n').map((m: string) => 'anvil: ' + m));
      });
    }),
    new Promise<ethers.providers.JsonRpcProvider>((_, reject) =>
      setTimeout(() => reject(new Error('anvil failed to start')), ANVIL_START_TIMEOUT)
    ),
  ]);
});
