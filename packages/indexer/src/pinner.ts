import { Job, Queue, Worker } from 'bullmq';
import { parseIpfsCid, parseIpfsUrl, readRawIpfs, uncompress } from '@usecannon/builder';
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

    const exists = await s3.objectExists(cid);
    if (exists) return;

    const rawData = await readRawIpfs({
      ipfsUrl: config.IPFS_URL,
      cid,
    });

    await s3.putObject(cid, rawData);
  },

  async PIN_PACKAGE(data: { cid: string }) {
    // eslint-disable-next-line no-console
    console.log('PIN_PACKAGE: ', data.cid);

    const cid = parseIpfsUrl(data.cid) || parseIpfsCid(data.cid);
    if (!cid) throw new Error(`Invalid CID ${data.cid}`);

    const exists = await s3.objectExists(cid);
    if (exists) return;

    const rawPackageData = await readRawIpfs({
      ipfsUrl: config.IPFS_URL,
      cid,
    });

    await s3.putObject(cid, rawPackageData);

    const packageData = JSON.parse(uncompress(rawPackageData));

    const miscCid = parseIpfsUrl(packageData.miscUrl) || parseIpfsCid(packageData.miscUrl);

    if (!miscCid) return;

    const miscData = await readRawIpfs({
      ipfsUrl: config.IPFS_URL,
      cid: miscCid,
    });

    await s3.putObject(miscCid, miscData);
  },
} as const;

export type PinnerJobName = keyof typeof processors;
export type PinnerJobData = Parameters<(typeof processors)[PinnerJobName]>[0];
export type PinnerJob = Job<PinnerJobData, void, PinnerJobName>;

export function createQueue(redisUrl: string) {
  const queue = new Queue<PinnerJob>(QUEUE_NAME, {
    connection: parseRedisUrl(redisUrl),
  });

  return queue;
}

export function createWorker(redisUrl: string) {
  const worker = new Worker<PinnerJobData, any, PinnerJobName>(
    QUEUE_NAME,
    async (job) => {
      if (!processors[job.name]) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      await processors[job.name](job.data);
    },
    { connection: parseRedisUrl(redisUrl), concurrency: 1 }
  );

  return worker;
}

// await redis.rPush(
//   rkey.RKEY_PROCESS_LATER_EVENTS,
//   unusableEvents.map((v) => JSON.stringify(v))
// );

// await redis.lPop(
//   rkey.RKEY_PROCESS_LATER_EVENTS,
//   unusableEvents.map((v) => JSON.stringify(v))
// );

// timeout of 30 seconds when downloading from IPFS
// make sure to use repo.usecannon.com for pulling
