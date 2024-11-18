import _ from 'lodash';
import { DeploymentInfo, deleteIpfs, readIpfs } from '@usecannon/builder';
import {
  getDb,
  RKEY_FRESH_UPLOAD_HASHES,
  RKEY_PKG_HASHES,
  RKEY_EXTRA_HASHES,
  RKEY_LAST_UPDATED,
  RKEY_FEES_PAID,
} from './db';

export async function cleanUnregisteredIpfs(
  ipfsUrl: string,
  gracePeriod: number,
  minFees: { startTimestamp: number; requiredFee: bigint }[]
) {
  const now = Math.floor(Date.now() / 1000);
  const rdb = await getDb(process.env.REDIS_URL!);
  const indexerRdb = await getDb(process.env.INDEXER_URL!);

  console.log('[init] clean cycle');
  const expired = await rdb.zRangeWithScores(RKEY_FRESH_UPLOAD_HASHES, 0, now - gracePeriod, { BY: 'SCORE' });

  for (const artifact of expired) {
    const readBatch = indexerRdb.multi();
    readBatch.get(RKEY_LAST_UPDATED);
    readBatch.zRange(RKEY_FEES_PAID, artifact.value, '+', { LIMIT: { offset: 0, count: 1 } });
    const [indexerLastUpdated, feesRecord]: [number, string] = (await readBatch.exec()) as any;

    if (indexerLastUpdated < artifact.score) {
      // artifact cannot be calculated yet, because we havent scanned that far on-chain
      continue;
    }

    const [urlRef, , feePaid] = feesRecord.split('#');
    const ipfsHash = _.last(urlRef.split('://'))!;
    if (BigInt(feePaid) > _.sortedIndexBy(minFees, { startTimestamp: artifact.score, requiredFee: 0n }, 'score')) {
      console.log(`[keep] ${artifact.value}`);
      try {
        // TODO: also keep the misc url
        const miscUrl = (JSON.parse(await readIpfs(ipfsUrl, ipfsHash, {}, false, 10000, 0)) as DeploymentInfo).miscUrl;
        const miscIpfsHash = _.last(miscUrl.split('://'))!;

        const batch = rdb.multi();
        batch.zAdd(RKEY_PKG_HASHES, { score: artifact.score, value: ipfsHash });
        batch.zRem(RKEY_FRESH_UPLOAD_HASHES, miscIpfsHash);
        batch.zAdd(RKEY_EXTRA_HASHES, { score: artifact.score, value: miscIpfsHash });
        await batch.exec();
      } catch (err) {
        console.log(`[fail] did not keep upload hash: ${err}`);
      }
    } else {
      console.log(`[wipe] ${artifact.value}`);
      try {
        await deleteIpfs(ipfsUrl, ipfsHash, {}, false, 10000);
      } catch (err) {
        console.log(`[fail] did not delete upload hash: ${err}`);
        continue;
      }
    }

    await rdb.zRem(RKEY_FRESH_UPLOAD_HASHES, artifact.value);
  }

  console.log('[done] clean cycle');
}
