import { RedisClientType } from 'redis';

// Extend Express Request type
declare module 'express' {
  interface Request {
    rdb: RedisClientType;
  }
}
