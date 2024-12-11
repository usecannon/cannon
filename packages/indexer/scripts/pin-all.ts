import * as viem from 'viem';
import { DEFAULT_REGISTRY_ADDRESS } from '@usecannon/builder';
import { createRpcClient } from '../src/helpers/rpc';
import { batches } from '../src/helpers/batches';
import { config } from '../src/config';
import { createQueue } from '../src/queue';

const packagePublishEvents = viem.parseAbi([
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string url, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublishWithFee(bytes32 indexed name, bytes32 indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner, uint256 feePaid)',
]);

const START_IDS = {
  '1': 16490000,
  '10': 119000000,
};

async function main() {
  const queue = createQueue();
  queue.createWorker();

  const mainnetClient = createRpcClient('mainnet', config.MAINNET_PROVIDER_URL);
  const optimismClient = createRpcClient('optimism', config.OPTIMISM_PROVIDER_URL);

  const mainnetUrls = await getPublishedPackages(mainnetClient, START_IDS['1']);
  const optimismUrls = await getPublishedPackages(optimismClient, START_IDS['10']);

  const deployUrls = new Set([...mainnetUrls.deployUrls, ...optimismUrls.deployUrls]);
  const metaUrls = new Set([...mainnetUrls.metaUrls, ...optimismUrls.metaUrls]);

  const batch = queue.createBatch();

  for (const deployUrl of deployUrls) {
    batch.add('PIN_PACKAGE', { cid: deployUrl });
  }

  for (const metaUrl of metaUrls) {
    batch.add('PIN_CID', { cid: metaUrl });
  }

  await batch.exec();

  await queue.waitForIdle();
  await queue.close();
}

async function getPublishedPackages(client: viem.PublicClient, fromBlock: number) {
  const toBlock = Number((await client.getBlockNumber()).toString());
  const chainId = await client.getChainId();

  const deployUrls = new Set<string>();
  const metaUrls = new Set<string>();

  for (const [_fromBlock, _toBlock] of batches(fromBlock, toBlock, 100_000)) {
    // eslint-disable-next-line no-console
    console.log({ chainId, _fromBlock, _toBlock });

    const filter = await client.createEventFilter({
      address: DEFAULT_REGISTRY_ADDRESS,
      events: packagePublishEvents,
      fromBlock: BigInt(_fromBlock),
      toBlock: BigInt(_toBlock),
    });

    const newLogs = await client.getFilterLogs({ filter });

    for (const log of newLogs) {
      if (!log.args.name) {
        // eslint-disable-next-line no-console
        console.error(log);
        throw new Error('Invalid event');
      }

      const args = log.args as any;
      const packageName = viem.hexToString(args.name, { size: 32 });
      const deployUrl = args.deployUrl ?? args.url;
      const metaUrl = args.metaUrl ?? '';

      if (deployUrl) deployUrls.add(deployUrl);
      if (metaUrl) metaUrls.add(metaUrl);
      // eslint-disable-next-line no-console
      console.log(log.eventName, packageName, deployUrl, metaUrl);
    }
  }

  return { deployUrls, metaUrls };
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
