import { initializeIndexes } from '../src/registry';
import { useRedis } from '../src/redis';
import { redisIndexExists } from '../src/helpers/redis';
import * as rkey from '../src/db';

async function main() {
  const redis = await useRedis();

  if (await redisIndexExists(redis, rkey.RKEY_PACKAGE_SEARCHABLE)) {
    await redis.ft.dropIndex(rkey.RKEY_PACKAGE_SEARCHABLE);
  }

  if (await redisIndexExists(redis, rkey.RKEY_ABI_SEARCHABLE)) {
    await redis.ft.dropIndex(rkey.RKEY_ABI_SEARCHABLE);
  }

  await initializeIndexes(redis as any);

  await redis.quit();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
