import { after } from 'node:test';
import { Server } from 'node:http';
import { promisify } from 'node:util';
import express from 'express';
import { getPort } from 'get-port-please';
import connectBusboy from 'connect-busboy';
import { getContentCID } from '../../../builder/src/ipfs';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => promisify(server.close.bind(server))()));
});

/**
 * Minimal implementation of IPFS cluster KUBO Api, intended for tests
 */
export async function ipfsServerMock() {
  const mockStorage = new Map<string, Buffer>();

  const port = await getPort();
  const app = express();

  app.use(connectBusboy({ immediate: true }));

  async function ipfsMockAdd(data: Buffer) {
    const cid = await getContentCID(data);
    mockStorage.set(cid, data);
    return cid;
  }

  function ipfsMockGet(cid: string) {
    return mockStorage.get(cid);
  }

  async function ipfsMockRemove(cid: string) {
    mockStorage.delete(cid);
  }

  function ipfsMockClear() {
    mockStorage.clear();
  }

  app.post('/api/v0/add', async (req, res) => {
    if (!req.busboy) {
      return res.status(400).end('no upload data');
    }

    req.busboy.on('file', (name, file) => {
      file.on('data', async (data) => {
        try {
          const cid = await ipfsMockAdd(data);
          res.json({ Hash: cid }).end();
        } catch (e) {
          res.status(500).end('ipfs write error');
        }
      });
    });
  });

  app.post('/api/v0/cat', async (req, res) => {
    const cid = req.query.arg;

    if (!cid) {
      return res.status(400).end('invalid cid');
    }

    const data = mockStorage.get(cid as string);
    if (!data) {
      return res.status(404).end('file not found on ipfs mocked data');
    }

    res.send(data).end();
  });

  const server = await new Promise<Server>((resolve) => {
    const _server = app.listen(port, () => resolve(_server));
  });

  servers.push(server);

  return {
    ipfsUrl: `http://127.0.0.1:${port}`,
    ipfsMockAdd,
    ipfsMockGet,
    ipfsMockRemove,
    ipfsMockClear,
  };
}
