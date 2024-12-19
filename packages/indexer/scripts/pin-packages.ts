import { extractValidCid } from '@usecannon/builder';
import { createQueue } from '../src/queue';

async function main() {
  const cids = process.argv.slice(2).map(extractValidCid).filter(Boolean);

  const queue = createQueue();
  queue.createWorker();

  const batch = queue.createBatch();
  for (const cid of cids) batch.add('PIN_PACKAGE', { cid });
  await batch.exec();

  await queue.waitForIdle();
  await queue.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
