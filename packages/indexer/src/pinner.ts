import { Job, Queue, Worker } from 'bullmq';
import { getDeploymentImports, parseIpfsCid, parseIpfsUrl, readRawIpfs, uncompress, writeRawIpfs } from '@usecannon/builder';
import { getS3Client } from '@usecannon/repo/src/s3';
import { parseRedisUrl } from './helpers/parse-redis-url';
import { config } from './config';

const QUEUE_NAME = 'pinner-queue';

const s3 = getS3Client(config);

const processors = {
  async PIN_CID(data: { cid: string }) {
    // eslint-disable-next-line no-console
    console.log('PIN_CID: ', data.cid);

    const cid = parseIpfsUrl(data.cid) || parseIpfsCid(data.cid);
    if (!cid) throw new Error(`Invalid CID ${data.cid}`);

    const existsOnS3 = await s3.objectExists(cid);
    const rawData = Buffer.from(
      existsOnS3
        ? await s3.getObject(cid)
        : await readRawIpfs({
            ipfsUrl: config.IPFS_URL,
            cid,
          })
    );

    if (existsOnS3) {
      await writeRawIpfs({
        ipfsUrl: config.IPFS_URL,
        data: rawData,
      });
    } else {
      await s3.putObject(cid, rawData);
    }
  },

  async PIN_PACKAGE(data: { cid: string }, queue: PinnerQueue) {
    // eslint-disable-next-line no-console
    console.log('PIN_PACKAGE: ', data.cid);

    const cid = parseIpfsUrl(data.cid) || parseIpfsCid(data.cid);
    if (!cid) throw new Error(`Invalid CID ${data.cid}`);

    const existsOnS3 = await s3.objectExists(cid);

    const rawPackageData = Buffer.from(
      existsOnS3
        ? await s3.getObject(cid)
        : await readRawIpfs({
            ipfsUrl: config.IPFS_URL,
            cid,
          })
    );

    const packageData = JSON.parse(uncompress(rawPackageData));

    const jobs: PinnerJobRaw[] = [];

    if (packageData.miscUrl) {
      jobs.push({ name: 'PIN_CID', data: { cid: packageData.miscUrl } });
    }

    for (const subPackage of getDeploymentImports(packageData)) {
      jobs.push({ name: 'PIN_PACKAGE', data: { cid: subPackage.url } });
    }

    await queue.addBulk(jobs);

    if (existsOnS3) {
      await writeRawIpfs({
        ipfsUrl: config.IPFS_URL,
        data: rawPackageData,
      });
    } else {
      await s3.putObject(cid, rawPackageData);
    }
  },
} as const;

export type PinnerJobName = keyof typeof processors;
export type PinnerJobData = Parameters<(typeof processors)[PinnerJobName]>[0];
export type PinnerJob = Job<PinnerJobData, void, PinnerJobName>;
export type PinnerJobRaw = { name: PinnerJobName; data: PinnerJobData };
export type PinnerQueue = Queue<PinnerJobData, void, PinnerJobName>;
export type PinnerWorker = Worker<PinnerJobData, void, PinnerJobName>;

export function createQueue(redisUrl: string): PinnerQueue {
  const queue = new Queue<PinnerJobData, void, PinnerJobName>(QUEUE_NAME, {
    connection: parseRedisUrl(redisUrl),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  return queue;
}

export function createWorker(redisUrl: string, queue: PinnerQueue) {
  const worker = new Worker<PinnerJobData, any, PinnerJobName>(
    QUEUE_NAME,
    async (job) => {
      if (!processors[job.name]) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      await processors[job.name](job.data, queue);
    },
    {
      connection: parseRedisUrl(redisUrl),
      concurrency: config.QUEUE_CONCURRENCY,
    }
  );

  return worker;
}

export async function runWithPinner(cb: (params: { queue: PinnerQueue; worker: PinnerWorker }) => Promise<void>) {
  const queue = createQueue(config.REDIS_URL);
  const worker = createWorker(config.REDIS_URL, queue);

  worker.on('completed', (job: PinnerJob) => {
    // eslint-disable-next-line no-console
    console.log('completed: ', job.name, job.data.cid);
  });

  worker.on('failed', (job: PinnerJob | undefined, error: Error) => {
    // eslint-disable-next-line no-console
    console.log('failed: ', job?.name, job?.data.cid, error);
  });

  // eslint-disable-next-line no-console
  console.log('pending jobs: ', await queue.count());

  await cb({ queue, worker });

  let count = await queue.count();
  do {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    count = await queue.count();
    // eslint-disable-next-line no-console
    console.log('pending jobs: ', count);
  } while (count);

  // await worker.close();
  // await queue.close();
}
