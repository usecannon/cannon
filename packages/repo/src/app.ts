import { Server } from 'node:http';
import cors from 'cors';
import express, { Express } from 'express';
import morgan from 'morgan';
import connectBusboy from 'connect-busboy';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import * as routes from './routes';

import type { RepoContext } from './types';

export function createApp(ctx: RepoContext): { app: Express; start: () => Promise<Server> } {
  const app = express();

  if (ctx.config.NODE_ENV !== 'production') {
    app.set('json spaces', 2);
  }

  if (ctx.config.TRUST_PROXY) {
    app.enable('trust proxy');
  }

  app.use(morgan('short'));
  app.use(cors());
  app.use(helmet());

  app.get('/favicon.ico', (req, res) => res.status(204));

  app.use(
    rateLimit({
      windowMs: ctx.config.RATE_LIMIT_WINDOW,
      limit: ctx.config.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      validate: { trustProxy: !ctx.config.TRUST_PROXY },
    })
  );

  app.use(connectBusboy({ immediate: true }));

  app.use(routes.add(ctx));
  app.use(routes.cat(ctx));
  app.use(routes.addFolder(ctx));
  app.use(routes.health(ctx));

  return {
    app,

    start() {
      return new Promise<Server>((resolve) => {
        const _server = app.listen(Number(ctx.config.PORT), () => {
          resolve(_server);
        });
      });
    },
  };
}
