import { runWithPinner } from '../src/pinner';

async function main() {
  await runWithPinner(async ({ queue }) => {
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
