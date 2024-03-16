import http from 'node:http';
import { Readable } from 'node:stream';
import { spawn, ChildProcess } from 'node:child_process';
import { CANNON_CHAIN_ID } from '@usecannon/builder';
import * as viem from 'viem';
import Debug from 'debug';
import _ from 'lodash';
import { execPromise, toArgs } from './helpers';
import { AnvilOptions } from './util/anvil';
import { gray } from 'chalk';

import { cannonChain, getChainById } from './chains';

const debug = Debug('cannon:cli:rpc');

export type RpcOptions = {
  forkProvider?: viem.PublicClient;
  forkBlockNumber?: number;
  timestamp?: number;
};

const ANVIL_OP_TIMEOUT = 10000;

export type CannonRpcNode = ChildProcess &
  RpcOptions & {
    host: string;
    port: number;
    chainId: number;
  };

// saved up here to allow for reset of existing process
let anvilInstance: CannonRpcNode | null = null;
let anvilProvider: (viem.PublicClient & viem.WalletClient & viem.TestClient) | null = null;

export const versionCheck = _.once(async () => {
  const anvilVersionInfo = await execPromise('anvil --version');

  if (
    anvilVersionInfo.match(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/)![0] < '2023-06-04'
  ) {
    throw new Error("anvil version too old. please run 'foundryup' to get the latest version");
  }
});

export async function runRpc(anvilOptions: AnvilOptions, rpcOptions: RpcOptions = {}): Promise<CannonRpcNode> {
  const { forkProvider } = rpcOptions;

  await versionCheck();

  if (_.isNil(anvilOptions.chainId)) {
    anvilOptions.chainId = CANNON_CHAIN_ID;
  }

  // reduce image size by not creating unnecessary accounts
  if (_.isNil(anvilOptions.accounts)) {
    anvilOptions.accounts = 1;
  }

  if (anvilOptions.forkUrl && rpcOptions.forkProvider) {
    throw new Error('Cannot set both an anvil forkUrl and a proxy provider connection');
  }

  // create a tiny proxy server (the most reliable way to make sure that the connection can work anywhere)
  if (forkProvider) {
    const url = await createProviderProxy(forkProvider);
    anvilOptions.forkUrl = url;
  }

  if (anvilInstance && anvilInstance.exitCode === null) {
    console.log('shutting down existing anvil subprocess', anvilInstance.pid);

    return Promise.race([
      new Promise<CannonRpcNode>((resolve) => {
        anvilInstance!.once('close', async () => {
          anvilInstance = null;
          resolve(await runRpc(anvilOptions, rpcOptions));
        });
        anvilInstance!.kill();
      }),
      timeout(ANVIL_OP_TIMEOUT, 'could not shut down previous anvil') as Promise<CannonRpcNode>,
    ]);
  }

  let opts = toArgs(anvilOptions);

  // Anvil fails to accept the `forkUrl` and `chainId` options on the Arbitrum network.
  // Ref: https://github.com/foundry-rs/foundry/issues/4786
  if ('forkUrl' in anvilOptions) {
    opts = toArgs(_.omit(anvilOptions, ['chainId']));
  }

  debug('starting anvil instance with options: ', anvilOptions);

  return Promise.race<Promise<CannonRpcNode>>([
    new Promise<CannonRpcNode>((resolve, reject) => {
      anvilInstance = spawn('anvil', opts) as CannonRpcNode;

      anvilInstance.port = anvilOptions.port!;
      anvilInstance.forkProvider = forkProvider;
      anvilInstance.chainId = anvilOptions.chainId!;

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
          console.log(gray('Anvil instance running on:', host, '\n'));

          // TODO: why is this type not working out? (something about mode being wrong?)
          anvilProvider = viem
            .createTestClient({
              mode: 'anvil',
              chain: anvilOptions.chainId ? getChainById(anvilOptions.chainId) || cannonChain : cannonChain,
              transport: viem.http(host),
            })
            .extend(viem.publicActions)
            .extend(viem.walletActions) as any;

          anvilInstance!.host = host;
          resolve(anvilInstance!);
        }

        debug(chunk);
      });

      anvilInstance.stderr?.on('data', (rawChunk) => {
        const chunk = rawChunk.toString('utf8');
        console.error(chunk.split('\n').map((m: string) => 'anvil: ' + m));
      });
    }),
    timeout(ANVIL_OP_TIMEOUT, 'anvil failed to start') as Promise<CannonRpcNode>,
  ]);
}

function timeout(period: number, msg: string) {
  return new Promise<ChildProcess>((_, reject) => setTimeout(() => reject(new Error(msg)), period));
}

export function getProvider(expectedAnvilInstance: ChildProcess): typeof anvilProvider {
  if (anvilInstance === expectedAnvilInstance) {
    return anvilProvider!;
  } else {
    throw new Error('anvil instance is not as expected');
  }
}

export function createProviderProxy(provider: viem.Client): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      const reqJson = JSON.parse(await streamToString(req));

      try {
        const proxiedResult = await provider.request(reqJson);

        res.writeHead(200);
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            result: proxiedResult,
            id: reqJson.id,
          })
        );
      } catch (err) {
        console.log('got rpc error', err);
        res.writeHead(400);
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: err,
            id: reqJson.id,
          })
        );
      }
    });

    server.on('listening', () => {
      const addrInfo = server.address() as { address: string; family: 'IPv4' | 'IPv6'; port: number };
      debug(`Proxied server listening on: ${addrInfo.address}:${addrInfo.port} (${addrInfo.family})`);
      resolve(`http://127.0.0.1:${addrInfo.port}`);
    });

    server.listen();
  });
}

function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
