import { after } from 'node:test';
import { RedisMemoryServer } from 'redis-memory-server';

const servers: RedisMemoryServer[] = [];

after(async function () {
  await Promise.all(servers.map((server) => server.stop()));
});

export async function redisServerMock() {
  const server = new RedisMemoryServer();

  servers.push(server);

  const host = await server.getHost();
  const port = await server.getPort();

  return { REDIS_URL: `redis://${host}:${port}` };
}
