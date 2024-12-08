import * as viem from 'viem';
import { DEFAULT_REGISTRY_ADDRESS } from '@usecannon/builder';
import { createRpcClient } from '../src/helpers/rpc';
import { batches } from '../src/helpers/batches';
import { config } from '../src/config';
import { createQueue, createWorker, PinnerJob } from '../src/pinner';

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
  const mainnetClient = createRpcClient('mainnet', config.MAINNET_PROVIDER_URL);
  const optimismClient = createRpcClient('optimism', config.OPTIMISM_PROVIDER_URL);

  const mainnetUrls = await getPublishedPackages(mainnetClient, START_IDS['1']);
  const optimismUrls = await getPublishedPackages(optimismClient, START_IDS['10']);

  const deployUrls = new Set([...mainnetUrls.deployUrls, ...optimismUrls.deployUrls]);
  const metaUrls = new Set([...mainnetUrls.metaUrls, ...optimismUrls.metaUrls]);

  const queue = createQueue(config.REDIS_URL);
  const worker = createWorker(config.REDIS_URL);

  worker.on('completed', (job: PinnerJob) => {
    // eslint-disable-next-line no-console
    console.log('completed: ', job.name, job.data.cid);
  });

  worker.on('failed', (job: PinnerJob | undefined, error: Error) => {
    // eslint-disable-next-line no-console
    console.log('failed: ', job?.name, job?.data.cid, error.message);
  });

  for (const deployUrl of deployUrls) {
    await queue.add('PIN_PACKAGE', { cid: deployUrl });
  }

  for (const metaUrl of metaUrls) {
    await queue.add('PIN_CID', { cid: metaUrl });
  }

  let count = await queue.count();
  do {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    count = await queue.count();
    // eslint-disable-next-line no-console
    console.log('queue count: ', count);
  } while (count);
}

async function getPublishedPackages(client: viem.PublicClient, fromBlock2: number) {
  const toBlock = Number((await client.getBlockNumber()).toString());
  const fromBlock = toBlock - 100_000;
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
