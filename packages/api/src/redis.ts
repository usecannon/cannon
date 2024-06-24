import { createClient } from 'redis';
import { config } from './config';
import { ServiceUnavailableError } from './errors';

const client = createClient({
  url: config.REDIS_URL,
  socket: {
    reconnectStrategy: (retries, err) => {
      // After 5 retries, halt the server
      if (retries > 5) {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
      }

      return 5_000; // retry after 5 secs
    },
  },
});

client.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log(' · redis connected ·');
});

client.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});

void client.connect();

export async function useRedis() {
  if (!client.isReady) throw new ServiceUnavailableError();
  return client;
}
