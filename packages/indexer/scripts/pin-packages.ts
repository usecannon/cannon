import { parseIpfsCid, parseIpfsUrl } from '@usecannon/builder';
import { PinnerJobRaw, runWithPinner } from '../src/pinner';

async function main() {
  const cids = process.argv
    .slice(2)
    .map((cid) => parseIpfsUrl(cid) || parseIpfsCid(cid))
    .filter(Boolean);

  await runWithPinner(
    async ({ queue }) => {
      await queue.addBulk(cids.map((cid) => ({ name: 'PIN_PACKAGE', data: { cid } } as PinnerJobRaw)));
    },
    { withWorker: true }
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
