import { getPort } from 'get-port-please';
import { createServer } from '../../src/server';

// PORT=8328 REDIS_URL=redis://... UPSTREAM_IPFS_URL=http://localhost:9095 node dist/index.js
export async function repoServer({ redisUrl, ipfsUrl }: { redisUrl: string; ipfsUrl: string }) {
  const port = await getPort();

  const server = await createServer({
    port: port.toString(),
    redisUrl,
    upstreamIpfsUrl: ipfsUrl,
  });

  return { server, repoUrl: `http://127.0.0.1:${port}` };
}
