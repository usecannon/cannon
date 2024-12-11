import { afterAll, afterEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import { RedisClientType } from 'redis';
import { getDb } from '../../src/db';
import { getS3Client, S3Client } from '../../src/s3';
import { repoServer } from './repo-server';
import { IpfsMock, ipfsServerMock } from './ipfs-server-mock';
import { s3ServerMock } from './s3-server-mock';
import { redisServerMock } from './redis-server-mock';
import { getPort, setInitialRange } from './get-port';

import type { Config } from '../../src/config';

let bootstrapIndex = 0;

export function bootstrap() {
  const workerId = parseInt(process.env.VITEST_WORKER_ID || '0');
  const bootstrapId = bootstrapIndex++;

  const ctx = {} as {
    repo: supertest.Agent;
    rdb: RedisClientType;
    s3: S3Client;
    ipfsMock: IpfsMock;
    redisMock: Awaited<ReturnType<typeof redisServerMock>>;
    s3Mock: Awaited<ReturnType<typeof s3ServerMock>>;
    server: Awaited<ReturnType<typeof repoServer>>;
  };

  beforeAll(async function () {
    // Make sure that the getPort function does not return the same port when called in a row
    const startingPort = 3000 + workerId * 100 + bootstrapId * 10;
    setInitialRange(startingPort);

    const [PORT, ipfsMock, redisMock, s3Mock] = await Promise.all([
      getPort().then((port) => port.toString()),
      ipfsServerMock(),
      redisServerMock(),
      s3ServerMock('repo-v2'),
    ]);

    const config: Config = {
      PORT,
      NODE_ENV: 'test',
      TRUST_PROXY: true,
      REDIS_URL: redisMock.REDIS_URL,
      IPFS_URL: ipfsMock.IPFS_URL,
      S3_ENDPOINT: s3Mock.S3_ENDPOINT,
      S3_BUCKET: s3Mock.S3_BUCKET,
      S3_REGION: s3Mock.S3_REGION,
      S3_KEY: s3Mock.S3_KEY,
      S3_SECRET: s3Mock.S3_SECRET,
    };

    const s3 = getS3Client(config);
    const rdb = await getDb(config.REDIS_URL);
    const server = await repoServer({ config, s3, rdb });

    // create a client to make requests to the Repo server
    ctx.repo = supertest.agent(server.app);
    ctx.rdb = rdb;
    ctx.s3 = s3;

    ctx.server = server;
    ctx.ipfsMock = ipfsMock;
    ctx.redisMock = redisMock;
    ctx.s3Mock = s3Mock;
  });

  afterEach(async function () {
    await ctx.s3Mock.reset();
    ctx.ipfsMock.reset();
  });

  afterAll(async function () {
    await ctx.server.close();
    await ctx.ipfsMock.close();
    await ctx.redisMock.close();
    await ctx.s3Mock.close();
  });

  return ctx;
}
