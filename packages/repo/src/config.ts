import { bool, CleanedEnv, CleanedEnvAccessors, cleanEnv, num, str } from 'envalid';

const configSpecs = {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    devDefault: 'development',
    default: 'production',
  }),
  PORT: str({ default: '8081' }),
  TRUST_PROXY: bool({ devDefault: true, default: false }),
  RATE_LIMIT_WINDOW: num({ default: 10 * 1000 }),
  RATE_LIMIT_MAX: num({ default: 50 }),
  MEMORY_CACHE: num({ default: 10_000 }),
  REDIS_URL: str({ devDefault: 'redis://localhost:6379' }),
  IPFS_URL: str({ devDefault: 'https://ipfs.io' }),
  S3_ENDPOINT: str({ devDefault: '' }),
  S3_BUCKET: str({ devDefault: 'cannon' }),
  S3_FOLDER: str({ devDefault: 'repo-v2' }),
  S3_REGION: str({ devDefault: 'us-east-1' }),
  S3_KEY: str({ devDefault: '' }),
  S3_SECRET: str({ devDefault: '' }),
  BUILD_PINATA_URL: str({ devDefault: 'https://api.pinata.cloud' }),
  BUILD_PINATA_API_JWT: str({ devDefault: '' }),
};

export type Config = Omit<CleanedEnv<typeof configSpecs>, keyof CleanedEnvAccessors>;

export function loadConfig(environment: unknown) {
  return cleanEnv(environment, configSpecs);
}
