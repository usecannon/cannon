import { describe, it, TestContext } from 'node:test';
import { uncompress, prepareFormData } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { assertRes } from './helpers/assert-res';
import { loadFixture } from './helpers/fixtures';

describe('POST /api/v0/add', async function () {
  const ctx = bootstrap();

  it.only('should return 400 when no data is provided', async function (t: TestContext) {
    const res = await ctx.repo.post('/api/v0/add');

    assertRes(t, res, {
      status: 400,
      data: 'no upload data',
    });
  });

  it('should return 400 when trying to add non cannon package', async function (t: TestContext) {
    const { content } = await loadFixture('greeter-misc');
    const { formData } = await prepareFormData(content);

    const res = await ctx.repo.post('/api/v0/add', formData);

    assertRes(t, res, {
      status: 400,
      data: 'does not appear to be cannon package',
    });
  });

  it('should successfully add valid package data', async function (t: TestContext) {
    const pkg = await loadFixture('registry');
    const pkgData = await prepareFormData(pkg.content);

    const res = await ctx.repo.post('/api/v0/add', pkgData.formData);

    assertRes(t, res, {
      status: 200,
      data: { Hash: pkg.cid },
    });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(pkg.cid)));
    t.assert.deepStrictEqual(saved, pkg.content);

    // After adding the package, we should also be able to add the misc data
    const misc = await loadFixture('registry-misc');
    const miscData = await prepareFormData(misc.content);
    const miscRes = await ctx.repo.post('/api/v0/add', miscData.formData);

    assertRes(t, miscRes, {
      status: 200,
      data: { Hash: misc.cid },
    });

    const files = await ctx.s3List();
    console.log(files);
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
