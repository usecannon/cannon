import { describe, it, TestContext } from 'node:test';
import { uncompress, prepareFormData } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';

describe('POST /api/v0/add', async function () {
  const ctx = bootstrap();

  it.only('should return 400 when no data is provided', async function () {
    await ctx.repo.post('/api/v0/add').expect(400, 'no upload data');
  });

  it('should return 400 when trying to add non cannon package', async function () {
    const { content } = await loadFixture('greeter-misc');
    const { formData } = await prepareFormData(content);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', formData.get('file'))
      .expect(400, 'does not appear to be cannon package');
  });

  it('should successfully add valid package data', async function (t: TestContext) {
    const pkg = await loadFixture('registry');
    const pkgData = await prepareFormData(pkg.content);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', pkgData.formData.get('file'))
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: pkg.cid });
      });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(pkg.cid)));
    t.assert.deepStrictEqual(saved, pkg.content);

    // After adding the package, we should also be able to add the misc data
    const misc = await loadFixture('registry-misc');
    const miscData = await prepareFormData(misc.content);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', miscData.formData.get('file'))
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: misc.cid });
      });

    const files = await ctx.s3List();
    console.log(files);
  });

  it('should return same hash for identical data', async function (t: TestContext) {
    const { cid, content } = await loadFixture('owned-greeter');
    const { formData } = await prepareFormData(content);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', formData.get('file'))
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: cid });
      });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved, content);

    const { formData: formData2 } = await prepareFormData(content);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', formData2.get('file'))
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: cid });
      });

    const saved2 = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved2, content);
  });
});
