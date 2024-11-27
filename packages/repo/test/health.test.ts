import { describe, it, TestContext } from 'node:test';
import { bootstrap } from './helpers/bootstrap';
import { assertRes } from './helpers/assert-res';

describe('GET /health', async function () {
  const ctx = bootstrap();

  it('should return 200 when healthy', async function (t: TestContext) {
    const res = await ctx.repo.get('/health');

    assertRes(t, res, {
      status: 200,
      data: { status: 'ok' },
    });
  });
});
