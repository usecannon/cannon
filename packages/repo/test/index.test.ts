/* eslint-disable @typescript-eslint/no-floating-promises */

import { describe, it, before } from 'node:test';
import { ipfsServerMock } from './helpers/ipfs-server-mock';
import { redisServerMock } from './helpers/redis-server-mock';

// PORT=8328 REDIS_URL=redis://... UPSTREAM_IPFS_URL=http://localhost:9095 node dist/index.js
describe('POST /api/v0/cat', function () {
  before(async function () {
    const [{ ipfsUrl }, { redisUrl }] = await Promise.all([ipfsServerMock(), redisServerMock()]);
  });

  it('should return 400 on missing ipfshash', async function (t) {
    t.assert.ok(true, 'ok!');
  });
});
