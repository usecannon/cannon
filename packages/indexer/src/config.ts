import { cleanEnv, str } from 'envalid';
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
  ETHERSCAN_API_URL: str({ default: 'https://api.etherscan.io/api' }),
  ETHERSCAN_API_KEY: str({ default: '' }),
});
