import { before } from 'node:test';
import supertest from 'supertest';
import { RedisClientType } from 'redis';
import { repoServer } from './repo-server';
import { ipfsServerMock } from './ipfs-server-mock';
import { redisServerMock } from './redis-server-mock';
import { s3ServerMock } from './s3-server-mock';

export function bootstrap() {
  const ctx = {} as {
    repo: supertest.Agent;
    rdb: RedisClientType;
    ipfsMockAdd: (data: Buffer) => Promise<string>;
    ipfsMockGet: (cid: string) => Buffer | undefined;
    ipfsMockRemove: (cid: string) => Promise<void>;
    ipfsMockClear: () => void;
    s3List: () => Promise<string[]>;
  };

  before(async function () {
    const { IPFS_URL, ipfsMockAdd, ipfsMockGet, ipfsMockRemove, ipfsMockClear } = await ipfsServerMock();
    const { REDIS_URL } = await redisServerMock();
    const S3_BUCKET = 'repo-v2';
    const { S3_ENDPOINT, S3_REGION, S3_KEY, S3_SECRET, s3List } = await s3ServerMock(S3_BUCKET);

    const repo = await repoServer({
      NODE_ENV: 'test',
      REDIS_URL,
      IPFS_URL,
      S3_ENDPOINT,
      S3_BUCKET,
      S3_REGION,
      S3_KEY,
      S3_SECRET,
    });

    // create a client to make requests to the Repo server
    ctx.repo = supertest.agent(repo.app);

    ctx.rdb = repo.rdb;

    ctx.ipfsMockAdd = ipfsMockAdd;
    ctx.ipfsMockGet = ipfsMockGet;
    ctx.ipfsMockRemove = ipfsMockRemove;
    ctx.ipfsMockClear = ipfsMockClear;
    ctx.s3List = s3List;
  });

  return ctx;
}
