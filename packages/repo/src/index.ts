import 'dotenv/config';

import { loadConfig } from './config';
import { createServer } from './server';

const config = loadConfig(process.env);

createServer(config).catch((err) => {
  console.error(err);
  process.exit(1);
});
