import { before } from 'node:test';
import supertest from 'supertest';
import { RedisClientType } from 'redis';
import { getDb } from '../../src/db';
import { getS3Client, S3Client } from '../../src/s3';
import { repoServer } from './repo-server';
import { IpfsMock, ipfsServerMock } from './ipfs-server-mock';
import { redisServerMock } from './redis-server-mock';
import { s3ServerMock } from './s3-server-mock';

import type { Config } from '../../src/config';
import { getPort } from './get-port';

export function bootstrap() {
  const ctx = {} as {
    repo: supertest.Agent;
    rdb: RedisClientType;
    s3: S3Client;
    ipfsMock: IpfsMock;
  };

  before(async function () {
    const PORT = await getPort().then((port) => port.toString());
    const ipfsMock = await ipfsServerMock();
    const { REDIS_URL } = await redisServerMock();

    const S3_BUCKET = 'repo-v2';
    const { S3_ENDPOINT, S3_REGION, S3_KEY, S3_SECRET } = await s3ServerMock(S3_BUCKET);

    const config: Config = {
      PORT,
      NODE_ENV: 'test',
      TRUST_PROXY: true,
      REDIS_URL,
      IPFS_URL: ipfsMock.IPFS_URL,
      S3_ENDPOINT,
      S3_BUCKET,
      S3_REGION,
      S3_KEY,
      S3_SECRET,
    };

    const s3 = getS3Client(config);
    const rdb = await getDb(config);

    const repo = await repoServer({ config, s3, rdb });

    // create a client to make requests to the Repo server
    ctx.repo = supertest.agent(repo.app);
    ctx.rdb = rdb;
    ctx.s3 = s3;
    ctx.ipfsMock = ipfsMock;
  });

  return ctx;
}
