import { describe, it } from 'vitest';
import { version } from '../package.json';
import { bootstrap } from './helpers/bootstrap';

describe('GET /health', function () {
  const ctx = bootstrap();

  it('should return 200 when healthy', async function () {
    await ctx.repo.get('/health').expect(200, {
      status: 'ok',
      version,
    });
  });
});
