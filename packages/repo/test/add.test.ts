import { describe, expect, it } from 'vitest';
import { parseIpfsUrl, uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';
import { RKEY_FRESH_UPLOAD_HASHES } from '../src/db';

describe('POST /api/v0/add', function () {
  const ctx = bootstrap();

  it('should return 400 when no data is provided', async function () {
    await ctx.repo.post('/api/v0/add').expect(400, 'no upload data');
  });

  it('should return 400 when trying to add non cannon package', async function () {
    const { data } = await loadFixture('greeter-misc');
    await ctx.repo.post('/api/v0/add').attach('file', data).expect(400, 'does not appear to be cannon package');
  });

  it('should return ok for already existing object', async function () {
    const { cid, data } = await loadFixture('owned-greeter');

    await ctx.s3.putObject(cid, data);

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', data)
      .expect(200)
      .expect((res) => {
        expect(JSON.parse(res.text)).toEqual({ Hash: cid });
      });
  });

  it('should successfully add valid package data', async function () {
    const pkg = await loadFixture('registry');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', pkg.data)
      .expect(200)
      .expect((res) => {
        expect(JSON.parse(res.text)).toEqual({ Hash: pkg.cid });
      });

    const saved = await ctx.s3.getObject(pkg.cid);
    const parsed = JSON.parse(uncompress(saved));
    expect(parsed).toEqual(pkg.content);

    // check that the cid was added to the fresh upload hashes
    const pkgScore = await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, pkg.cid);
    expect(pkgScore).toBeGreaterThan(0);

    // After adding the package, we should also be able to add the misc data
    const miscIpfsHash = parseIpfsUrl(pkg.content.miscUrl)!;
    const miscScore = await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, miscIpfsHash);
    expect(miscScore).toBeGreaterThan(0);
  });

  it('should allow to add a misc file that is already registered', async function () {
    const misc = await loadFixture('registry-misc');

    await ctx.rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: Date.now(), value: misc.cid }, { NX: true });

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', misc.data)
      .expect(200)
      .expect((res) => {
        expect(JSON.parse(res.text)).toEqual({ Hash: misc.cid });
      });
  });

  it('should return same hash for identical data', async function () {
    const { cid, content, data } = await loadFixture('owned-greeter');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', data)
      .expect(200)
      .expect((res) => {
        expect(JSON.parse(res.text)).toEqual({ Hash: cid });
      });

    const saved = await ctx.s3.getObject(cid);
    const parsed = JSON.parse(uncompress(saved));
    expect(parsed).toEqual(content);

    const newData = await loadFixture('owned-greeter');

    await ctx.repo
      .post('/api/v0/add')
      .attach('file', newData.data)
      .expect(200)
      .expect((res) => {
        expect(JSON.parse(res.text)).toEqual({ Hash: cid });
      });

    const saved2 = await ctx.s3.getObject(cid);
    const parsed2 = JSON.parse(uncompress(saved2));
    expect(parsed2).toEqual(content);
  });
});
