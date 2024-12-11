import { parseCid } from '@usecannon/builder';
import { QueueJobRaw, runWithQueue } from '../src/queue';

async function main() {
  const cids = process.argv
    .slice(2)
    .map((cid) => parseCid(cid))
    .filter(Boolean);

  await runWithQueue(
    async ({ queue }) => {
      const jobs: QueueJobRaw[] = [];

      for (const cid of cids) {
        jobs.push({ name: 'PIN_PACKAGE', data: { cid } });
      }

      await queue.addBulk(jobs);
    },
    { startWorker: true }
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
