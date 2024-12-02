import { before } from 'node:test';
import supertest from 'supertest';
import { repoServer } from './repo-server';
import { ipfsServerMock } from './ipfs-server-mock';
import { redisServerMock } from './redis-server-mock';
import { s3ServerMock } from './s3-server-mock';

export function bootstrap() {
  const ctx = {} as {
    repo: supertest.Agent;
    ipfsMockAdd: (data: Buffer) => Promise<string>;
    ipfsMockGet: (cid: string) => Buffer | undefined;
    ipfsMockRemove: (cid: string) => Promise<void>;
    ipfsMockClear: () => void;
    s3List: () => Promise<string[]>;
  };

  before(async function () {
    const { ipfsUrl, ipfsMockAdd, ipfsMockGet, ipfsMockRemove, ipfsMockClear } = await ipfsServerMock();
    const { redisUrl } = await redisServerMock();
    const { s3Url, s3List } = await s3ServerMock();

    const repo = await repoServer({ redisUrl, ipfsUrl });

    // create a client to make requests to the Repo server
    ctx.repo = supertest.agent(repo.server);

    ctx.ipfsMockAdd = ipfsMockAdd;
    ctx.ipfsMockGet = ipfsMockGet;
    ctx.ipfsMockRemove = ipfsMockRemove;
    ctx.ipfsMockClear = ipfsMockClear;
    ctx.s3List = s3List;
  });

  return ctx;
}
