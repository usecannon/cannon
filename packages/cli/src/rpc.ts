import http from 'http';

import { Readable } from 'stream';

import { ethers } from 'ethers';

import { spawn, ChildProcess } from 'child_process';

import Debug from 'debug';
import { CANNON_CHAIN_ID, CannonWrapperGenericProvider } from '@usecannon/builder';
import { execPromise } from './helpers';
import _ from 'lodash';

const debug = Debug('cannon:cli:rpc');

export type RpcOptions = {
  port: number;
  forkProvider?: ethers.providers.JsonRpcProvider;
  chainId?: number;
};

const ANVIL_OP_TIMEOUT = 10000;

export type CannonRpcNode = ChildProcess & RpcOptions;

// saved up here to allow for reset of existing process
let anvilInstance: CannonRpcNode | null = null;
let anvilProvider: CannonWrapperGenericProvider | null = null;

export const versionCheck = _.once(async () => {
  const anvilVersionInfo = await execPromise('anvil --version');

  if (
    anvilVersionInfo.match(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/)![0] < '2023-06-04'
  ) {
    throw new Error("anvil version too old. please run 'foundryup' to get the latest version");
  }
});

export async function runRpc({ port, forkProvider, chainId = CANNON_CHAIN_ID }: RpcOptions): Promise<CannonRpcNode> {
  await versionCheck();

  if (anvilInstance && anvilInstance.exitCode === null) {
    console.log('shutting down existing anvil subprocess', anvilInstance.pid);

    return Promise.race([
      new Promise<CannonRpcNode>(resolve => {
        anvilInstance!.once('close', async () => {
          anvilInstance = null;
          resolve(await runRpc({ port, forkProvider, chainId }));
        });
        anvilInstance!.kill();
      }),
      timeout(ANVIL_OP_TIMEOUT, 'could not shut down previous anvil') as Promise<CannonRpcNode>
    ]);
  }

  const opts = ['--port', port.toString()];
  opts.push('--chain-id', chainId.toString());

  // reduce image size by not creating unnecessary accounts
  opts.push('--accounts', '1');

  if (forkProvider) {
    // create a tiny proxy server (the most reliable way to make sure that the connection can work anywhere)

    const url = await createProviderProxy(forkProvider);

    opts.push('--fork-url', url);
  }

  return Promise.race<Promise<CannonRpcNode>>([
    new Promise<CannonRpcNode>((resolve, reject) => {
      anvilInstance = spawn('anvil', opts) as CannonRpcNode;

      anvilInstance.port = port;
      anvilInstance.forkProvider = forkProvider;
      anvilInstance.chainId = chainId;

      process.once('exit', () => anvilInstance?.kill());

      let state: 'spawning' | 'running' | 'listening' = 'spawning';

      anvilInstance?.on('spawn', () => {
        state = 'running';
      });

      anvilInstance?.on('error', err => {
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

      anvilInstance?.stdout?.on('data', rawChunk => {
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

      anvilInstance.stderr?.on('data', rawChunk => {
        const chunk = rawChunk.toString('utf8');
        console.error(chunk.split('\n').map((m: string) => 'anvil: ' + m));
      });
    }),
    timeout(ANVIL_OP_TIMEOUT, 'anvil failed to start') as Promise<CannonRpcNode>
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

export function createProviderProxy(provider: ethers.providers.JsonRpcProvider): Promise<string> {
  return new Promise(resolve => {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const reqJson = JSON.parse(await streamToString(req));

      try {
        const proxiedResult = await provider.send(reqJson.method, reqJson.params);

        res.writeHead(200);
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            result: proxiedResult,
            id: reqJson.id
          })
        );
      } catch (err) {
        console.log('got rpc error', err);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: err,
            id: reqJson.id
          })
        );
      }
    });

    server.on('listening', () => {
      const addrInfo = server.address() as { address: string; family: 'IPv4' | 'IPv6'; port: number };
      resolve(`http://${addrInfo.family === 'IPv6' ? '[' + addrInfo.address + ']' : addrInfo.address}:${addrInfo.port}`);
    });

    server.listen();
  });
}

function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('error', err => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
