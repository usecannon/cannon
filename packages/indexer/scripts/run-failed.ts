import { config } from '../src/config';
import { createQueue, createWorker, PinnerJob } from '../src/pinner';

async function main() {
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

  const failedJobs = await queue.getFailed();
  // eslint-disable-next-line no-console
  console.log('failed jobs: ', failedJobs.length);

  for (const job of failedJobs) {
    await job.retry();
  }

  const pendingFailedJobs = await queue.getFailedCount();
  // eslint-disable-next-line no-console
  console.log('pending failed jobs: ', pendingFailedJobs);

  let count = await queue.count();
  do {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    count = await queue.count();
    // eslint-disable-next-line no-console
    console.log('queue count: ', count);
  } while (count);

  await queue.close();
  await worker.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
