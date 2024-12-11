import { createQueue } from '../src/queue';

async function main() {
  const queue = createQueue();
  queue.createWorker();

  const failedJobs = await queue.queue.getFailed();

  // eslint-disable-next-line no-console
  console.log('failed jobs: ', failedJobs.length);

  for (const job of failedJobs) {
    await job.retry();
  }

  await queue.waitForIdle();
  await queue.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
