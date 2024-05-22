import { createClient } from 'redis';

export const RKEY_FRESH_UPLOAD_HASHES = 'repo:tempUploadHashes';
export const RKEY_PKG_HASHES = 'repo:pkgHashes';
export const RKEY_EXTRA_HASHES = 'repo:longTermHashes';

export async function getDb(url: string) {
  const client = createClient({ url });
  await client.connect();
  return client;
}
