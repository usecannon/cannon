import { createServer } from './server';

if (!process.env.REDIS_URL) {
  throw new Error('please set REDIS_URL');
}

if (!process.env.UPSTREAM_IPFS_URL) {
  throw new Error('please set UPSTREAM_IPFS_URL');
}

createServer({
  port: process.env.PORT || '3000',
  redisUrl: process.env.REDIS_URL!,
  upstreamIpfsUrl: process.env.UPSTREAM_IPFS_URL!,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
