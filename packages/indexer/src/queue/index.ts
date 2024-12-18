import { createQueue as createQueueHelper } from '../helpers/create-queue';
import { config } from '../config';
import { pinningJobs } from './pinning';

export type Queue = ReturnType<typeof createQueue>;

export function createQueue() {
  return createQueueHelper(pinningJobs, {
    redisUrl: config.REDIS_URL,
    queueName: config.QUEUE_NAME,
    retries: config.QUEUE_RETRIES,
    defaultConcurrency: config.QUEUE_CONCURRENCY,
  });
}
