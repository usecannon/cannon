import { Server } from 'node:http';
import { after } from 'node:test';
import { getPort } from 'get-port-please';
import { createServer } from '../../src/server';
import { Config } from '../config';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => server.close()));
});

// PORT=8328 REDIS_URL=redis://... UPSTREAM_IPFS_URL=http://localhost:9095 node dist/index.js
export async function repoServer(config: Omit<Config, 'PORT'>) {
  const port = await getPort();

  const { app, server, rdb, s3 } = await createServer({
    ...config,
    PORT: port.toString(),
  });

  servers.push(server);

  return { app, rdb, s3, repoUrl: `http://127.0.0.1:${port}` };
}
