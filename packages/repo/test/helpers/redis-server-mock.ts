import { RedisMemoryServer } from 'redis-memory-server';

const servers: RedisMemoryServer[] = [];

export async function redisServerMock() {
  const server = new RedisMemoryServer();

  servers.push(server);

  const host = await server.getHost();
  const port = await server.getPort();

  return {
    REDIS_URL: `redis://${host}:${port}`,
    close: server.stop.bind(server),
  };
}
