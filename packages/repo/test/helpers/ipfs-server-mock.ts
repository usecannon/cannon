import { after } from 'node:test';
import { Server } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import express from 'express';
import { getPort } from 'get-port-please';
import { compress, getContentCID } from '@usecannon/builder/dist/src/ipfs';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => promisify(server.close.bind(server))()));
});

/**
 * Minimal implementation of IPFS cluster KUBO Api, intended for tests
 */
export async function ipfsServerMock() {
  const mockStorage = new Map<string, Buffer>();

  await loadFixtures(mockStorage);

  const port = await getPort();
  const app = express();

  app.post('/api/v0/add', async (req, res) => {
    if (!req.body) {
      return res.status(400).end('no upload data');
    }

    try {
      const data = Buffer.from(compress(JSON.stringify(req.body)));
      const cid = await getContentCID(data);
      mockStorage.set(cid, data);
      res.json({ Hash: cid });
    } catch (e) {
      res.status(500).end('ipfs write error');
    }
  });

  app.post('/api/v0/cat', async (req, res) => {
    const cid = req.query.arg;

    if (!cid) {
      return res.status(400).end('invalid cid');
    }

    const data = mockStorage.get(cid as string);
    if (!data) {
      return res.status(404).end('file not found on fixtures');
    }

    res.send(data).end();
  });

  const server = await new Promise<Server>((resolve) => {
    const _server = app.listen(port, () => resolve(_server));
  });

  servers.push(server);

  return { ipfsUrl: `http://127.0.0.1:${port}` };
}

async function loadFixtures(mockStorage: Map<string, Buffer>) {
  const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
  const files = await fs.readdir(fixturesDir);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const cid = file.replace('.json', '');
      const content = await fs.readFile(path.join(fixturesDir, file));
      const data = Buffer.from(compress(JSON.stringify(JSON.parse(content.toString()))));

      const resultCid = await getContentCID(data);
      if (resultCid !== cid) {
        throw new Error(`Fixture ${file}: Result cid "${resultCid}" !== "${cid}"`);
      }

      mockStorage.set(cid, data);
    }
  }
}
