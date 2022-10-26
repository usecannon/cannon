import { ethers } from 'ethers';

import { spawn, ChildProcess } from 'child_process';

import Debug from 'debug';
import { CANNON_CHAIN_ID, CannonWrapperGenericProvider } from '@usecannon/builder';

const debug = Debug('cannon:cli:rpc');

type RpcOptions = {
  port: number;
  forkUrl?: string;
  chainId?: number;
};

const ANVIL_OP_TIMEOUT = 10000;

// saved up here to allow for reset of existing process
let anvilInstance: ReturnType<typeof spawn> | null = null;
let anvilProvider: CannonWrapperGenericProvider | null = null;

export function runRpc({ port, forkUrl, chainId }: RpcOptions): Promise<ChildProcess> {
  if (anvilInstance && anvilInstance.exitCode === null) {
    console.log('shutting down existing anvil subprocess', anvilInstance.pid);

    return Promise.race([
      new Promise<ChildProcess>((resolve) => {
        anvilInstance!.once('close', async () => {
          anvilInstance = null;
          resolve(await runRpc({ port, forkUrl, chainId }));
        });
        anvilInstance!.kill();
      }),
      timeout(ANVIL_OP_TIMEOUT, 'could not shut down previous anvil'),
    ]);
  }

  const opts = ['--port', port.toString()];

  opts.push('--chain-id', (chainId || CANNON_CHAIN_ID).toString());

  // reduce image size by not creating unnecessary accounts
  opts.push('--accounts', '1');

  if (forkUrl) {
    opts.push('--fork-url', forkUrl);
  }

  return Promise.race<Promise<ChildProcess>>([
    new Promise<ChildProcess>((resolve, reject) => {
      anvilInstance = spawn('anvil', opts);

      process.once('exit', () => anvilInstance?.kill());

      let state: 'spawning' | 'running' | 'listening' = 'spawning';

      anvilInstance?.on('spawn', () => {
        state = 'running';
      });

      anvilInstance?.on('error', (err) => {
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

      anvilInstance?.stdout?.on('data', (rawChunk) => {
        // right now check for expected output string to connect to node
        const chunk = rawChunk.toString('utf8');
        const m = chunk.match(/Listening on (.*)/);
        if (m) {
          const host = 'http://' + m[1];
          state = 'listening';
          //console.log('anvil spawned at', host);
          anvilProvider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider(host));
          resolve(anvilInstance!);
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
}

function timeout(period: number, msg: string) {
  return new Promise<ChildProcess>((_, reject) => setTimeout(() => reject(new Error(msg)), period));
}

export function getProvider(expectedAnvilInstance: ChildProcess): CannonWrapperGenericProvider {
  if (anvilInstance === expectedAnvilInstance) {
    return anvilProvider!;
  } else {
    throw new Error('anvil instance is not as expected');
  }
}
