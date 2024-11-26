/* eslint-disable @typescript-eslint/no-floating-promises */

import { describe, before, it, TestContext } from 'node:test';
import axios, { AxiosInstance } from 'axios';
import { uncompress } from '@usecannon/builder/dist/src/ipfs';
import { repoServer } from './helpers/repo-server';
import { ipfsServerMock } from './helpers/ipfs-server-mock';
import { redisServerMock } from './helpers/redis-server-mock';

const TEST_IPFS_HASH = 'QmYrLsLZwGGg68XwGkdrx8q9KaRSHq7e5sa6PbT7kNXjKw';
const UNREGISTERED_HASH = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';

let repo: AxiosInstance;

before(async function () {
  const [{ ipfsUrl }, { redisUrl }] = await Promise.all([ipfsServerMock(), redisServerMock()]);
  const { repoUrl } = await repoServer({ redisUrl, ipfsUrl });

  // create a client to make requests to the Repo server
  repo = axios.create({
    baseURL: repoUrl,
    validateStatus: () => true, // never throw an error, easier to assert error codes
  });
});

describe('GET /health', async function () {
  it('should return 200 when healthy', async function (t: TestContext) {
    const res = await repo.get('/health');
    t.assert.strictEqual(res.status, 200);
    t.assert.deepStrictEqual(res.data, { status: 'ok' });
  });
});

describe('POST /api/v0/cat', async function () {
  it('should return 400 on missing ipfshash', async function (t: TestContext) {
    const res = await repo.post('/api/v0/cat');
    t.assert.strictEqual(res.status, 400);
    t.assert.strictEqual(res.data, 'argument "ipfs-path" is required');
  });

  it('should return 404 on unregistered ipfshash', async function (t: TestContext) {
    const res = await repo.post(`/api/v0/cat?arg=${UNREGISTERED_HASH}`);
    t.assert.strictEqual(res.status, 404);
    t.assert.strictEqual(res.data, 'unregistered ipfs data');
  });

  it('should return a pinned file that is not registered', async function (t: TestContext) {
    const res = await repo.post(
      `/api/v0/cat?arg=${TEST_IPFS_HASH}`,
      {},
      {
        responseEncoding: 'application/octet-stream',
        responseType: 'arraybuffer',
      }
    );

    t.assert.strictEqual(res.status, 200);
    const result = JSON.parse(uncompress(res.data));
    t.assert.strictEqual(result.def.name, 'registry');
  });
});
