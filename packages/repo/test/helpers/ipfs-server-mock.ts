import { after } from 'node:test';
import { Server } from 'node:http';
import fs, { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import express from 'express';
import { getPort } from 'get-port-please';
import { compress, getContentCID } from '@usecannon/builder/dist/src/ipfs';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => promisify(server.close.bind(server))()));
});

export async function ipfsServerMock() {
  const port = await getPort();

  const app = express();

  app.post('/api/v0/cat', async (req, res) => {
    const cid = req.query.arg;

    if (!cid) {
      return res.status(400).end('invalid cid');
    }

    const filepath = path.resolve(__dirname, '..', 'fixtures', `${cid}.json`);

    if (!fs.existsSync(filepath)) {
      return res.status(404).end('file not found on fixtures');
    }

    const content = await fsPromises.readFile(filepath);
    const data = Buffer.from(compress(JSON.stringify(JSON.parse(content.toString()))));

    const resultCid = await getContentCID(data);
    if (resultCid !== cid) {
      throw new Error(`Result cid "${resultCid}" !== "${cid}"`);
    }

    res.send(data).end();
  });

  const server = await new Promise<Server>((resolve) => {
    const _server = app.listen(port, () => resolve(_server));
  });

  servers.push(server);

  return { ipfsUrl: `http://127.0.0.1:${port}` };
}
