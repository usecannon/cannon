import { runWithPinner } from '../src/pinner';

async function main() {
  await runWithPinner(
    async ({ queue }) => {
      const failedJobs = await queue.getFailed();
      // eslint-disable-next-line no-console
      console.log('failed jobs: ', failedJobs.length);

      for (const job of failedJobs) {
        await job.retry();
      }
    },
    { withWorker: true }
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
