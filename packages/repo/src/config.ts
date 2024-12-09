import { bool, CleanedEnv, CleanedEnvAccessors, cleanEnv, str } from 'envalid';

const configSpecs = {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    devDefault: 'development',
    default: 'production',
  }),
  PORT: str({ default: '8081' }),
  TRUST_PROXY: bool({ devDefault: true, default: false }),
  REDIS_URL: str({ devDefault: 'redis://localhost:6379' }),
  IPFS_URL: str({ devDefault: 'https://ipfs.io' }),
  S3_ENDPOINT: str({ devDefault: '' }),
  S3_BUCKET: str({ devDefault: 'repo-v2' }),
  S3_REGION: str({ devDefault: 'us-east-1' }),
  S3_KEY: str({ devDefault: '' }),
  S3_SECRET: str({ devDefault: '' }),
};

export type Config = Omit<CleanedEnv<typeof configSpecs>, keyof CleanedEnvAccessors>;

export function loadConfig(environment: unknown) {
  return cleanEnv(environment, configSpecs);
}
