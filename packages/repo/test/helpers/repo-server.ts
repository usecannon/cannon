import path from 'node:path';
import { getPort } from 'get-port-please';
import { spawn } from './spawn';

// PORT=8328 REDIS_URL=redis://... UPSTREAM_IPFS_URL=http://localhost:9095 node dist/index.js
export async function repoServer({ redisUrl, ipfsUrl }: { redisUrl: string; ipfsUrl: string }) {
  const port = await getPort();

  const serverPath = path.resolve(__dirname, '..', '..', 'src', 'index.ts');

  const proc = spawn('pnpm', ['ts-node', serverPath], {
    PORT: port.toString(),
    REDIS_URL: redisUrl,
    UPSTREAM_IPFS_URL: ipfsUrl,
  });

  for await (const line of proc) {
    if (line.includes('listening on port ')) break;
  }

  return { repoUrl: `http://127.0.0.1:${port}` };
}
