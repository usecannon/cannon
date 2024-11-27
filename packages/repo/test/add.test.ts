import { describe, it, TestContext } from 'node:test';
import { uncompress, prepareFormData } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { assertRes } from './helpers/assert-res';
import { loadFixture } from './helpers/fixtures';

describe('POST /api/v0/add', async function () {
  const ctx = bootstrap();

  it('should return 400 when no data is provided', async function (t: TestContext) {
    const res = await ctx.repo.post('/api/v0/add');

    assertRes(t, res, {
      status: 400,
      data: 'no upload data',
    });
  });

  it('should successfully add valid package data', async function (t: TestContext) {
    const { cid, content } = await loadFixture('registry');
    const { formData } = await prepareFormData(content);

    const res = await ctx.repo.post('/api/v0/add', formData);

    assertRes(t, res, {
      status: 200,
      data: { Hash: cid },
    });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved, content);
  });

  it('should return same hash for identical data', async function (t: TestContext) {
    const { cid, content } = await loadFixture('owned-greeter');
    const { formData } = await prepareFormData(content);

    const res1 = await ctx.repo.post('/api/v0/add', formData);
    assertRes(t, res1, { status: 200, data: { Hash: cid } });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved, content);

    const { formData: formData2 } = await prepareFormData(content);

    const res2 = await ctx.repo.post('/api/v0/add', formData2);
    assertRes(t, res2, { status: 200, data: { Hash: cid } });

    const saved2 = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved2, content);
  });
});
