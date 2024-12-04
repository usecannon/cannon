import { describe, it, TestContext } from 'node:test';
import { uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';

describe('POST /api/v0/add', async function () {
  const ctx = bootstrap();

  it('should return 400 when no data is provided', async function () {
    await ctx.repo.post('/api/v0/add').expect(400, 'no upload data');
  });

  it('should return 400 when trying to add non cannon package', async function () {
    const { data } = await loadFixture('greeter-misc');
    await ctx.repo.post('/api/v0/add').attach('file', data).expect(400, 'does not appear to be cannon package');
  });

  it('should successfully add valid package data', async function (t: TestContext) {
    const pkg = await loadFixture('registry');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', pkg.data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: pkg.cid });
      });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(pkg.cid)));
    t.assert.deepStrictEqual(saved, pkg.content);

    // After adding the package, we should also be able to add the misc data
    const misc = await loadFixture('registry-misc');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', misc.data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: misc.cid });
      });

    const files = await ctx.s3List();
    console.log(files);
  });

  it('should return same hash for identical data', async function (t: TestContext) {
    const { cid, content, data } = await loadFixture('owned-greeter');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: cid });
      });

    const saved = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved, content);

    const newData = await loadFixture('owned-greeter');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', newData.data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: cid });
      });

    const saved2 = JSON.parse(uncompress(ctx.ipfsMockGet(cid)));
    t.assert.deepStrictEqual(saved2, content);
  });
});
