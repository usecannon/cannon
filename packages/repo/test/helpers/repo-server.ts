import { Server } from 'node:http';
import { after } from 'node:test';
import { RepoContext } from '../../src/types';
import { createApp } from '../../src/app';

const servers: Server[] = [];

after(async function () {
  await Promise.all(servers.map((server) => server.close()));
});

export async function repoServer(ctx: RepoContext) {
  const { app, start } = createApp(ctx);

  const server = await start();

  server.on('close', async () => {
    await ctx.rdb.quit();
  });

  servers.push(server);

  return { app, repoUrl: `http://127.0.0.1:${ctx.config.PORT}` };
}
