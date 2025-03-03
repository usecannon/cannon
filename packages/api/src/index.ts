import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import packageJson from '../package.json';
import { config } from './config';
import { apiErrorHandler } from './errors';
import * as routes from './routes';

const app = express();

if (config.NODE_ENV !== 'production') {
  app.set('json spaces', 2);
}

if (config.TRUST_PROXY) {
  app.enable('trust proxy');
}

app.use(cors({
  origin: ['http://localhost:3000', 'https://safe.usecannon.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(helmet());

app.get('/favicon.ico', (req, res) => res.status(204));

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: !config.TRUST_PROXY },
  })
);

app.use(routes.metrics);
app.use(routes.chains);
app.use(routes.packages);
app.use(routes.search);

app.use(apiErrorHandler);

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`\n · status: running · version: ${packageJson.version} · port ${config.PORT} ·`);
});
