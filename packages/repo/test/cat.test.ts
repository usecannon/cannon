import { describe, it, TestContext } from 'node:test';
import { uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';

describe('POST /api/v0/cat', function () {
  const ctx = bootstrap();

  it('should return 400 on missing ipfshash', async function () {
    await ctx.repo.post('/api/v0/cat').expect(400, 'argument "ipfs-path" is required');
  });

  it('should return 404 on unregistered ipfshash', async function () {
    const { cid } = await loadFixture('owned-greeter');
    await ctx.repo.post(`/api/v0/cat?arg=${cid}`).expect(404, 'unregistered ipfs data');
  });

  it('should return a pinned file that is not registered but it is available on ipfs', async function (t: TestContext) {
    const { cid, data, content } = await loadFixture('registry');

    await ctx.ipfsMockAdd(data);

    const res = await ctx.repo
      .post(`/api/v0/cat?arg=${cid}`)
      .set('Accept', 'application/octet-stream')
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const result = JSON.parse(uncompress(res.body));
    t.assert.deepStrictEqual(result, content);
  });
});
