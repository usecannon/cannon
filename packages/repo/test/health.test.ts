import { describe, it } from 'node:test';
import { bootstrap } from './helpers/bootstrap';

describe('GET /health', function () {
  const ctx = bootstrap();

  it('should return 200 when healthy', async function () {
    await ctx.repo.get('/health').expect(200, {
      status: 'ok',
    });
  });
});
