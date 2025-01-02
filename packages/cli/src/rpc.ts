import { ChildProcess, spawn } from 'node:child_process';
import http from 'node:http';
import { Readable } from 'node:stream';
import { CANNON_CHAIN_ID, loadPrecompiles } from '@usecannon/builder';
import { gray } from 'chalk';
import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { getChainById } from './chains';
import { execPromise } from './helpers';
import { error, log } from './util/console';
import { anvilOptions as fullAnvilOptions } from './commands/config/anvil';
import { fromFoundryOptionsToArgs } from './util/foundry-options';

const debug = Debug('cannon:cli:rpc');

const cannonChain = getChainById(CANNON_CHAIN_ID);

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

export async function runRpc(anvilOptions: Record<string, any>, rpcOptions: RpcOptions = {}): Promise<CannonRpcNode> {
  debug('run rpc', anvilOptions, rpcOptions);
  const { forkProvider } = rpcOptions;

  await versionCheck();

  if (_.isNil(anvilOptions.chainId)) {
    anvilOptions.chainId = CANNON_CHAIN_ID;
  }

  // reduce image size by not creating unnecessary accounts
  if (_.isNil(anvilOptions.accounts)) {
    anvilOptions.accounts = 1;
  }

  anvilOptions.noRequestSizeLimit = true;

  if (anvilOptions.forkUrl && rpcOptions.forkProvider) {
    throw new Error('Cannot set both an anvil forkUrl and a proxy provider connection');
  }

  // create a tiny proxy server (the most reliable way to make sure that the connection can work anywhere)
  if (forkProvider) {
    const url = await createProviderProxy(forkProvider);
    anvilOptions.forkUrl = url;
  }

  if (anvilInstance && anvilInstance.exitCode === null) {
    log('shutting down existing anvil subprocess', anvilInstance.pid);

    return viem.withTimeout(
      () =>
        new Promise<CannonRpcNode>((resolve) => {
          anvilInstance!.once('close', async () => {
            anvilInstance = null;
            resolve(await runRpc(anvilOptions, rpcOptions));
          });
          anvilInstance!.kill();
        }),
      {
        timeout: ANVIL_OP_TIMEOUT,
        errorInstance: new Error('could not shut down previous anvil'),
      }
    );
  }

  const opts = fromFoundryOptionsToArgs(anvilOptions, fullAnvilOptions);

  debug('starting anvil instance with options: ', anvilOptions);

  return viem.withTimeout(
    () =>
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
            log(gray('Anvil instance running on:', host, '\n'));

            // TODO: why is this type not working out? (something about mode being wrong?)
            anvilProvider = viem
              .createTestClient({
                mode: 'anvil',
                chain: anvilOptions.chainId ? getChainById(anvilOptions.chainId) || cannonChain : cannonChain,
                transport: viem.http(host, { timeout: 180000 }),
              })
              .extend(viem.publicActions)
              .extend(viem.walletActions) as any;

            anvilInstance!.host = host;

            loadPrecompiles(anvilProvider as viem.TestClient)
              .then(() => resolve(anvilInstance!))
              .catch((err: any) => {
                throw err;
              });
          }

          debug(chunk);
        });

        anvilInstance.stderr?.on('data', (rawChunk) => {
          const chunk = rawChunk.toString('utf8');
          error(chunk.split('\n').map((m: string) => 'anvil: ' + m));
        });
      }),
    {
      timeout: ANVIL_OP_TIMEOUT,
      errorInstance: new Error(
        'Timeout - Anvil failed to start. If you are using a VPN or firewall, it might be causing a connection issue. Try disabling them.'
      ),
    }
  );
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
    const server = http.createServer(async (req: any, res: any) => {
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
        log('got rpc error', err);
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
