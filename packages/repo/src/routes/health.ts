import { Router } from 'express';
import packageJson from '../../package.json';
import { RepoContext } from '../types';

export function health(ctx: RepoContext) {
  const app: Router = Router();

  app.get('/health', async (_, res) => {
    try {
      // Check Redis connection
      await ctx.rdb.ping();
      res.json({
        status: 'ok',
        version: packageJson.version,
      });
    } catch (err) {
      res.status(503).json({ status: 'error', message: 'Redis connection failed' });
    }
  });

  return app;
}
