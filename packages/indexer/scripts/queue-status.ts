import { runWithQueue } from '../src/queue';

async function main() {
  await runWithQueue(async ({ queue }) => {
    const counts = await queue.getJobCounts();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(counts, null, 2));
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
