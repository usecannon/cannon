import { spawn } from 'child_process';
import { ethers } from 'ethers';

import { subtask } from 'hardhat/config';

import Debug from 'debug';

const debug = Debug('cannon:hardhat:rpc');

import { SUBTASK_RPC } from '../task-names';
import { CannonWrapperJsonRpcProvider } from '@usecannon/builder';

const ANVIL_OP_TIMEOUT = 10000;

// saved up here to allow for reset of existing process
let anvilInstance: ReturnType<typeof spawn> | null = null;

subtask(SUBTASK_RPC).setAction((settings, hre): Promise<ethers.providers.JsonRpcProvider> => {
  const { port, forkUrl, chainId } = settings;

  if (anvilInstance && anvilInstance.exitCode === null) {
    console.log('shutting down existing anvil subprocess', anvilInstance.pid);

    return Promise.race([
      new Promise<ethers.providers.JsonRpcProvider>((resolve) => {
        anvilInstance!.once('close', async () => {
          anvilInstance = null;
          resolve(await hre.run(SUBTASK_RPC, settings));
        });
        anvilInstance!.kill();
      }),
      timeout(ANVIL_OP_TIMEOUT, 'could not shut down previous anvil'),
    ]);
  }

  const opts = ['--port', port];
  if (chainId) {
    opts.push('--chain-id', chainId);
  }

  // reduce image size by not creating unnecessary accounts
  opts.push('--accounts', '1');

  if (forkUrl) {
    opts.push('--fork-url', forkUrl);
  }

  return Promise.race<Promise<ethers.providers.JsonRpcProvider>>([
    new Promise<ethers.providers.JsonRpcProvider>((resolve, reject) => {
      anvilInstance = spawn('anvil', opts);

      process.once('exit', () => anvilInstance?.kill());

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

      anvilInstance.stdout?.on('data', (rawChunk) => {
        // right now check for expected output string to connect to node
        const chunk = rawChunk.toString('utf8');
        const m = chunk.match(/Listening on (.*)/);
        if (m) {
          const host = 'http://' + m[1];
          state = 'listening';
          //console.log('anvil spawned at', host);
          resolve(new CannonWrapperJsonRpcProvider({}, host));
        }

        debug(chunk);
      });

      anvilInstance.stderr?.on('data', (rawChunk) => {
        const chunk = rawChunk.toString('utf8');
        console.error(chunk.split('\n').map((m: string) => 'anvil: ' + m));
      });
    }),
    timeout(ANVIL_OP_TIMEOUT, 'anvil failed to start'),
  ]);
});

function timeout(period: number, msg: string) {
  return new Promise<ethers.providers.JsonRpcProvider>((_, reject) => setTimeout(() => reject(new Error(msg)), period));
}
