import { ethers } from 'ethers';

import { spawn } from 'child_process';

import Debug from 'debug';

const debug = Debug('cannon:cli:rpc');

type RpcOptions = {
  port: number;
  forkUrl: string;
};

export const ANVIL_START_TIMEOUT = 3000;

export function runRpc({ port, forkUrl }: RpcOptions): Promise<ethers.providers.JsonRpcProvider> {
  const opts = ['--port', port.toString()];
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
  
  Foundry is required to use Cannon CLI. 
  
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
          debug('cannon:cli:rpc', 'anvil spawned at', host);
          resolve(new ethers.providers.JsonRpcProvider(host));
        }

        console.log(
          chunk
            .split('\n')
            .map((m: string) => 'anvil: ' + m)
            .join('\n')
        );
        debug('cannon:cli:rpc', chunk);
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
}
