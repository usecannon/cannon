import { Server } from 'node:http';
import _ from 'lodash';
import express, { Express } from 'express';
import morgan from 'morgan';
import connectBusboy from 'connect-busboy';
import consumers from 'stream/consumers';
import { DeploymentInfo } from '@usecannon/builder';
import { getContentCID, uncompress, parseIpfsUrl } from '@usecannon/builder/dist/src/ipfs';
import { RedisClientType } from 'redis';
import { getDb, RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES, RKEY_EXTRA_HASHES } from './db';
import health from './routes/health';

const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh

interface Params {
  rdb: RedisClientType;
}

export async function createServer({ rdb }: Params): Promise<Express> {
  const app = express();

  app.use(morgan('short'));
  app.use(connectBusboy({ immediate: true }));

  app.get('/health', async (req, res) => {
    try {
      // Check Redis connection
      await rdb.ping();
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(503).json({ status: 'error', message: 'Redis connection failed' });
    }
  });

  return { app };
}
