import { describe, it, TestContext } from 'node:test';
import superagent from 'superagent';
import { uncompress } from '../../builder/src/ipfs';
import { bootstrap } from './helpers/bootstrap';
import { loadFixture } from './helpers/fixtures';
// import { assertRes } from './helpers/assert-res';

describe('POST /api/v0/cat', async function () {
  const ctx = bootstrap();

  it('should return 400 on missing ipfshash', async function () {
    await ctx.repo.post('/api/v0/cat').expect(400, 'argument "ipfs-path" is required');
  });

  it('should return 404 on unregistered ipfshash', async function () {
    const { cid } = await loadFixture('owned-greeter');
    await ctx.repo.post(`/api/v0/cat?arg=${cid}`).expect(404, 'unregistered ipfs data');
  });

  it('should return a pinned file that is not registered but it is available on ipfs', async function (t: TestContext) {
    const { cid, data } = await loadFixture('registry');

    await ctx.ipfsMockAdd(data);

    const res = await ctx.repo
      .post(`/api/v0/cat?arg=${cid}`)
      .set('Accept', 'application/octet-stream')
      .buffer(true)
      .parse(superagent.parse.buffer)
      .expect(200);

    console.log(res.text);

    const result = JSON.parse(uncompress(res.text));
    t.assert.strictEqual(result.def.name, 'registry');
  });
});
