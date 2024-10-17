import { describe, before, it, TestContext } from 'node:test';
import axios, { AxiosInstance } from 'axios';
import { uncompress } from '@usecannon/builder/dist/src/ipfs';
import { repoServerMock } from './helpers/repo-server';
import { ipfsServerMock } from './helpers/ipfs-server-mock';
import { redisServerMock } from './helpers/redis-server-mock';

void describe('POST /api/v0/cat', async function () {
  let repo: AxiosInstance;

  before(async function () {
    const [{ ipfsUrl }, { redisUrl }] = await Promise.all([ipfsServerMock(), redisServerMock()]);
    const { repoUrl } = await repoServerMock({ redisUrl, ipfsUrl });
    repo = axios.create({
      baseURL: repoUrl,
      validateStatus: () => true, // never throw an error, easier to assert error codes
    });
  });

  await it('should return 400 on missing ipfshash', async function (t: TestContext) {
    const res = await repo.post('/api/v0/cat');
    t.assert.strictEqual(res.status, 400);
    t.assert.strictEqual(res.data, 'argument "ipfs-path" is required');
  });

  await it('should return 404 on unregistered ipfshash', async function (t: TestContext) {
    const res = await repo.post('/api/v0/cat?arg=QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB');
    t.assert.strictEqual(res.status, 404);
    t.assert.strictEqual(res.data, 'unregistered ipfs data');
  });

  await it('should return a pinned file that is not registered', async function (t: TestContext) {
    const res = await repo.post(
      '/api/v0/cat?arg=QmYrLsLZwGGg68XwGkdrx8q9KaRSHq7e5sa6PbT7kNXjKw',
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
