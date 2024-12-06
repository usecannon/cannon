import { after, afterEach } from 'node:test';
import { Server } from 'node:http';
import { promisify } from 'node:util';
import express from 'express';
import connectBusboy from 'connect-busboy';
import { getContentCID } from '../../../builder/src/ipfs';
import { getPort } from './get-port';

export interface IpfsMock {
  IPFS_URL: string;
  server: Server;
  add: (data: Buffer) => Promise<string>;
  get: (cid: string) => Buffer | undefined;
  remove: (cid: string) => Promise<void>;
  clear: () => void;
}

const mocks: IpfsMock[] = [];

afterEach(async function () {
  await Promise.all(mocks.map((ipfsMock) => ipfsMock.clear()));
});

after(async function () {
  await Promise.all(
    mocks.map((ipfsMock) => {
      return promisify(ipfsMock.server.close.bind(ipfsMock.server))();
    })
  );
});

/**
 * Minimal implementation of IPFS cluster KUBO Api, intended for tests
 */
export async function ipfsServerMock() {
  const mockStorage = new Map<string, Buffer>();
  const port = await getPort();

  const ipfsMock = {
    IPFS_URL: `http://127.0.0.1:${port}`,

    async add(data: Buffer) {
      const cid = await getContentCID(data);
      mockStorage.set(cid, data);
      return cid;
    },

    get(cid: string) {
      return mockStorage.get(cid);
    },

    async remove(cid: string) {
      mockStorage.delete(cid);
    },

    clear() {
      mockStorage.clear();
    },
  } as IpfsMock;

  const app = express();

  app.use(connectBusboy({ immediate: true }));

  app.post('/api/v0/add', async (req, res) => {
    if (!req.busboy) {
      return res.status(400).end('no upload data');
    }

    req.busboy.on('file', (name, file) => {
      file.on('data', async (data) => {
        try {
          const cid = await ipfsMock.add(data);
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

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', data.length);

    res.send(data).end();
  });

  ipfsMock.server = await new Promise<Server>((resolve) => {
    const _server = app.listen(port, () => resolve(_server));
  });

  mocks.push(ipfsMock);

  return ipfsMock;
}
