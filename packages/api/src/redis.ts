import { createClient } from 'redis';
import { config } from './config';

type RedisClient = ReturnType<typeof createClient>;

const clientGetter = new Promise<RedisClient>((resolve) => {
  const client = createClient({ url: config.REDIS_URL });

  client.on('ready', () => {
    resolve(client);
  });

  client.connect().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  });
});

export async function useRedis(): Promise<RedisClient> {
  return await clientGetter;
}
