import { createClient, RedisClientType } from 'redis';

export const RKEY_FRESH_UPLOAD_HASHES = 'repo:tempUploadHashes';
export const RKEY_PKG_HASHES = 'repo:pkgHashes';
export const RKEY_EXTRA_HASHES = 'repo:longTermHashes';

export const RKEY_FEES_PAID = 'reg:feesPaid';
export const RKEY_LAST_UPDATED = 'reg:lastTimestamp';

export async function getDb(redisUrl: string): Promise<RedisClientType> {
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries, err) => {
        // After 5 retries, halt the server
        if (retries > 5) {
          console.error(err);
          process.exit(1);
        }

        return 5_000; // retry after 5 secs
      },
    },
  });

  client.on('error', (err) => {
    console.error('redis error:', err);
  });

  await client.connect();
  await client.ping();

  return client as RedisClientType;
}
