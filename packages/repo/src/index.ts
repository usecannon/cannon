import 'dotenv/config';

import { version } from '../package.json';
import { loadConfig } from './config';
import { createApp } from './app';
import { getS3Client } from './s3';
import { getDb } from './db';
import { RepoContext } from './types';

async function main() {
  const config = loadConfig(process.env);

  const ctx = { config } as unknown as RepoContext;

  ctx.s3 = getS3Client(config, config.MEMORY_CACHE);
  ctx.rdb = await getDb(config.REDIS_URL);

  const app = createApp(ctx);

  const server = await app.start();

  console.log(`\n · version: ${version} · endpoint: http://127.0.0.1:${config.PORT} ·`);

  server.on('close', async () => {
    await ctx.rdb.quit();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
