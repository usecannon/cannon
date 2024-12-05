import { describe, it, afterEach, TestContext } from 'node:test';
import { parseIpfsUrl, uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';
import { RKEY_FRESH_UPLOAD_HASHES } from '../src/db';

describe('POST /api/v0/add', function () {
  const ctx = bootstrap();

  afterEach(async function () {
    await ctx.s3Clean();
  });

  it('should return 400 when no data is provided', async function () {
    await ctx.repo.post('/api/v0/add').expect(400, 'no upload data');
  });

  it('should return 400 when trying to add non cannon package', async function () {
    const { data } = await loadFixture('greeter-misc');
    await ctx.repo.post('/api/v0/add').attach('file', data).expect(400, 'does not appear to be cannon package');
  });

  it('should return ok for already existing object', async function (t: TestContext) {
    const { cid, data } = await loadFixture('owned-greeter');

    await ctx.s3.putObject(cid, data);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: cid });
      });
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

    // check that the cid was added to the fresh upload hashes
    const pkgScore = await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, pkg.cid);
    t.assert.ok(pkgScore);

    // After adding the package, we should also be able to add the misc data
    const miscIpfsHash = parseIpfsUrl(pkg.content.miscUrl)!;
    const miscScore = await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, miscIpfsHash);
    t.assert.ok(miscScore);
  });

  it('should allow to add a misc file that is already registered', async function (t: TestContext) {
    const misc = await loadFixture('registry-misc');

    await ctx.rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: Date.now(), value: misc.cid }, { NX: true });

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', misc.data)
      .expect(200)
      .expect((res) => {
        t.assert.deepStrictEqual(JSON.parse(res.text), { Hash: misc.cid });
      });
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
