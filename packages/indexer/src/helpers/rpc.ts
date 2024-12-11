import * as viem from 'viem';
import * as viemChains from 'viem/chains';
import { batches } from './batches';

type Chains = typeof viemChains;
type ChainName = keyof Chains;

export function createRpcClient(chainName: ChainName, rpcUrl: string): viem.PublicClient {
  if (!viemChains[chainName]) {
    throw new Error(`Unknown chain: ${chainName}`);
  }

  const transport = rpcUrl.startsWith('wss://') ? viem.webSocket(rpcUrl) : viem.http(rpcUrl);

  const client = viem.createPublicClient({
    chain: viemChains[chainName],
    transport,
  }) as viem.PublicClient;

  return client;
}

export async function* getLogsInBatches({
  client,
  address,
  events,
  fromBlock,
  toBlock,
  batchSize = 50_000,
}: {
  client: viem.PublicClient;
  address: viem.Address;
  events: viem.AbiEvent[];
  fromBlock: number;
  toBlock: number;
  batchSize?: number;
}) {
  for (const [_fromBlock, _toBlock] of batches(fromBlock, toBlock, batchSize)) {
    const filter = await client.createEventFilter({
      address,
      events,
      fromBlock: BigInt(_fromBlock),
      toBlock: BigInt(_toBlock),
    });

    const newLogs = await client.getFilterLogs({ filter });

    for (const log of newLogs) yield log;
  }
}
