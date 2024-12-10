import { RepoContext } from '../../src/types';
import { createApp } from '../../src/app';

export async function repoServer(ctx: RepoContext) {
  const { app, start } = createApp(ctx);

  const server = await start();

  server.on('close', async () => {
    await ctx.rdb.quit();
  });

  return {
    app,
    close: server.close.bind(server),
    repoUrl: `http://127.0.0.1:${ctx.config.PORT}`,
  };
}
