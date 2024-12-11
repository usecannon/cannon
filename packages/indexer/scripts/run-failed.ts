import { runWithQueue } from '../src/queue';

async function main() {
  await runWithQueue(
    async ({ queue }) => {
      const failedJobs = await queue.getFailed();
      // eslint-disable-next-line no-console
      console.log('failed jobs: ', failedJobs.length);

      for (const job of failedJobs) {
        await job.retry();
      }
    },
    { startWorker: true }
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
