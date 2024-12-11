import { createQueue } from '../src/queue';

async function main() {
  const queue = createQueue();
  const counts = await queue.queue.getJobCounts();

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(counts, null, 2));

  await queue.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
