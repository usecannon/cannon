import { createClient, RedisClientType } from 'redis';

export const RKEY_FRESH_UPLOAD_HASHES = 'repo:tempUploadHashes';
export const RKEY_PKG_HASHES = 'repo:pkgHashes';
export const RKEY_EXTRA_HASHES = 'repo:longTermHashes';

export const RKEY_FEES_PAID = 'reg:feesPaid';
export const RKEY_LAST_UPDATED = 'reg:lastTimestamp';

export async function getDb(url: string): Promise<RedisClientType> {
  const client = createClient({ url });
  await client.connect();
  return client as RedisClientType;
}
