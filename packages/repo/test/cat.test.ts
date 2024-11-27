import { describe, it, TestContext } from 'node:test';
import { compress, uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';
import { assertRes } from './helpers/assert-res';

describe('POST /api/v0/cat', async function () {
  const ctx = bootstrap();

  it('should return 400 on missing ipfshash', async function (t: TestContext) {
    const res = await ctx.repo.post('/api/v0/cat');

    assertRes(t, res, {
      status: 400,
      data: 'argument "ipfs-path" is required',
    });
  });

  it('should return 404 on unregistered ipfshash', async function (t: TestContext) {
    const { cid } = await loadFixture('owned-greeter');
    const res = await ctx.repo.post(`/api/v0/cat?arg=${cid}`);

    assertRes(t, res, {
      status: 404,
      data: 'unregistered ipfs data',
    });
  });

  it('should return a pinned file that is not registered but it is available on ipfs', async function (t: TestContext) {
    const { cid, data } = await loadFixture('registry');

    await ctx.ipfsMockAdd(data);

    const res = await ctx.repo.post(
      `/api/v0/cat?arg=${cid}`,
      {},
      {
        responseEncoding: 'application/octet-stream',
        responseType: 'arraybuffer',
      }
    );

    assertRes(t, res, {
      status: 200,
    });

    const result = JSON.parse(uncompress(res.data));
    t.assert.strictEqual(result.def.name, 'registry');
  });
});
