import { Server } from 'node:http';
import { after } from 'node:test';
import { getPort } from 'get-port-please';
import { createServer } from '../../src/server';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => server.close()));
});

// PORT=8328 REDIS_URL=redis://... UPSTREAM_IPFS_URL=http://localhost:9095 node dist/index.js
export async function repoServer({ redisUrl, ipfsUrl }: { redisUrl: string; ipfsUrl: string }) {
  const port = await getPort();

  const { app, server } = await createServer({
    port: port.toString(),
    redisUrl,
    upstreamIpfsUrl: ipfsUrl,
  });

  servers.push(server);

  return { app, repoUrl: `http://127.0.0.1:${port}` };
}
