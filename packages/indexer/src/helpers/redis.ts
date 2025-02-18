import { ActualRedisClientType } from '../redis';

export async function redisIndexExists(redis: ActualRedisClientType, indexName: string) {
  try {
    await redis.ft.info(indexName);
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unknown index name')) {
      return false;
    }

    throw err;
  }
}

export function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
      throw new Error('Invalid Redis protocol');
    }

    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379'),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parseInt(parsed.pathname?.slice(1) || '0'),
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Invalid Redis URL: ${err.message}`);
    }

    throw new Error(`Invalid Redis URL: ${err}`);
  }
}
