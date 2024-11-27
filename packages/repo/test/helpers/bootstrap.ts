import { before } from 'node:test';
import axios, { AxiosInstance } from 'axios';
import { repoServer } from './repo-server';
import { ipfsServerMock } from './ipfs-server-mock';
import { redisServerMock } from './redis-server-mock';

export function bootstrap() {
  const ctx = {} as {
    repo: AxiosInstance;
    ipfsMockAdd: (data: Buffer) => Promise<string>;
    ipfsMockGet: (cid: string) => Buffer | undefined;
    ipfsMockRemove: (cid: string) => Promise<void>;
    ipfsMockClear: () => void;
  };

  before(async function () {
    const [{ ipfsUrl, ipfsMockAdd, ipfsMockGet, ipfsMockRemove, ipfsMockClear }, { redisUrl }] = await Promise.all([
      ipfsServerMock(),
      redisServerMock(),
    ]);

    const { repoUrl } = await repoServer({ redisUrl, ipfsUrl });

    // create a client to make requests to the Repo server
    ctx.repo = axios.create({
      baseURL: repoUrl,
      validateStatus: () => true, // never throw an error, easier to assert error codes
    });

    ctx.ipfsMockAdd = ipfsMockAdd;
    ctx.ipfsMockGet = ipfsMockGet;
    ctx.ipfsMockRemove = ipfsMockRemove;
    ctx.ipfsMockClear = ipfsMockClear;
  });

  return ctx;
}
