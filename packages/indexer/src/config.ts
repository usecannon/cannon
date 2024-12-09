import { cleanEnv, str, num } from 'envalid';
import 'dotenv/config';

export const config = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'production',
    devDefault: 'development',
  }),
  IPFS_URL: str({ devDefault: 'http://127.0.0.1:5001' }),
  REDIS_URL: str({ devDefault: 'redis://localhost:6379' }),
  NOTIFY_PKGS: str({ default: '' }),
  MAINNET_PROVIDER_URL: str({ default: 'https://ethereum-rpc.publicnode.com' }),
  OPTIMISM_PROVIDER_URL: str({ default: 'https://optimism-rpc.publicnode.com' }),
  QUEUE_CONCURRENCY: num({ default: 5 }),
  S3_ENDPOINT: str({ devDefault: '' }),
  S3_BUCKET: str({ devDefault: 'cannon' }),
  S3_FOLDER: str({ devDefault: 'repo-v2' }),
  S3_REGION: str({ devDefault: 'us-east-1' }),
  S3_KEY: str({ devDefault: '' }),
  S3_SECRET: str({ devDefault: '' }),
});
