import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import packageJson from '../package.json';
import { config } from './config';
import { apiErrorHandler } from './errors';
import * as routes from './routes/packages';

const app = express();

app.use(cors());
app.use(helmet());

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

for (const route of Object.values(routes)) {
  app.use(route);
}

app.use(apiErrorHandler);

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n · status: running · version: ${packageJson.version} · port ${config.PORT} ·\n`);
});