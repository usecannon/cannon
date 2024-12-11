import { Job as BullJob, Queue as BullQueue, Worker as BullWorker } from 'bullmq';
import { parseRedisUrl } from './helpers/parse-redis-url';
import * as pinning from './workers/pinning';
import { config } from './config';

const actions = {
  ...pinning.actions,
};

const handlers = {
  ...pinning.handlers,
};

export type QueueJobName = keyof typeof handlers;
export type QueueAction = (typeof actions)[QueueJobName];
export type QueueHandler = (typeof handlers)[QueueJobName];

export type QueueJobData = Parameters<QueueHandler>[0];
export type QueueJobRaw = { name: QueueJobName; data: QueueJobData; opts?: { jobId: string } };

export type QueueJob = BullJob<QueueJobData, void, QueueJobName>;
export type Queue = BullQueue<QueueJobData, void, QueueJobName>;
export type QueueWorker = BullWorker<QueueJobData, void, QueueJobName>;

export function createQueue(redisUrl: string): Queue {
  const queue = new BullQueue<QueueJobData, void, QueueJobName>(config.QUEUE_NAME, {
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

export function createWorker(redisUrl: string, queue: Queue): QueueWorker {
  const worker = new BullWorker<QueueJobData, any, QueueJobName>(
    config.QUEUE_NAME,
    async (job) => {
      if (!handlers[job.name]) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      await handlers[job.name](job.data, queue);
    },
    {
      connection: parseRedisUrl(redisUrl),
      concurrency: config.QUEUE_CONCURRENCY,
    }
  );

  worker.on('completed', (job: QueueJob) => {
    // eslint-disable-next-line no-console
    console.log('[worker][pinner] completed: ', job.name, job.data.cid);
  });

  worker.on('failed', (job: QueueJob | undefined, error: Error) => {
    // eslint-disable-next-line no-console
    console.log('[worker][pinner] failed: ', job?.name, job?.data.cid, error.message);
  });

  return worker;
}

export async function runWithQueue<T extends boolean = false>(
  cb: (params: { queue: Queue; worker: T extends true ? QueueWorker : undefined }) => Promise<void>,
  opts?: { startWorker: T }
) {
  const queue = createQueue(config.REDIS_URL);
  const worker = opts?.startWorker ? createWorker(config.REDIS_URL, queue) : undefined;

  // eslint-disable-next-line no-console
  console.log('pending jobs: ', await queue.count());

  await cb({ queue, worker: worker as T extends true ? QueueWorker : undefined });

  if (worker) {
    while (await worker.isRunning()) {
      const count = await queue.count();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // eslint-disable-next-line no-console
      console.log('pending jobs: ', count);
    }

    await worker.close();
  }

  await queue.close();
}
