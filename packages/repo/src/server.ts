import { Server } from 'node:http';
import _ from 'lodash';
import express, { Express } from 'express';
import morgan from 'morgan';
import connectBusboy from 'connect-busboy';
import { RedisClientType } from 'redis';
import { DeploymentInfo } from '@usecannon/builder';
import { getContentCID, uncompress, parseIpfsUrl, parseIpfsCid } from '@usecannon/builder/dist/src/ipfs';
import { getDb, RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES, RKEY_EXTRA_HASHES } from './db';
import { readFile } from './helpers/read-file';
import { getS3Client, S3Client } from './s3';

import type { Config } from './config';

const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh

export async function createServer(
  config: Config
): Promise<{ app: Express; server: Server; rdb: RedisClientType; s3: S3Client }> {
  const rdb = await getDb(config.REDIS_URL);
  const s3 = getS3Client(config);

  const app = express();

  app.use(morgan('short'));
  app.use(connectBusboy({ immediate: true }));

  app.post('/api/v0/add', async (req: express.Request, res) => {
    const file = await readFile(req);

    if (!file) {
      return res.status(400).end('no upload data');
    }

    const cid = await getContentCID(file);

    const exists = await s3.objectExists(cid);

    if (exists) {
      return res.json({ Hash: cid }).end();
    }

    const now = Math.floor(Date.now() / 1000) + RKEY_FRESH_GRACE_PERIOD;

    const isSavable =
      (await rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, cid)) !== null || (await rdb.zScore(RKEY_PKG_HASHES, cid)) !== null;

    // if IPFS hash is not already allowed, lets see if this is a cannon package
    if (!isSavable) {
      try {
        const pkgData: DeploymentInfo = JSON.parse(uncompress(file));

        const miscIpfsHash = parseIpfsUrl(pkgData.miscUrl);

        if (!miscIpfsHash) {
          throw new Error(`Invalid package data for "${cid}"`);
        }

        // as a special step here, we also save the misc url (we dont want to save it anywhere else)
        await rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: miscIpfsHash }, { NX: true });
      } catch (err) {
        // pkg is not savable
        console.log('cannon package reading fail', err);
        return res.status(400).end('does not appear to be cannon package');
      }
    }

    // ensure the file is marked as a fresh upload
    await rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: cid }, { NX: true });

    try {
      await s3.putObject(cid, file);
      return res.json({ Hash: cid }).end();
    } catch (err) {
      console.error('cannon package upload to S3 fail', err);
      return res.status(500).end('file write error');
    }
  });

  app.post('/api/v0/cat', async (req, res) => {
    const cid = parseIpfsCid(req.query.arg);

    if (!cid) {
      // the exact error message for this 400 error is necessary for backwards compatibility
      return res.status(400).end('argument "ipfs-path" is required');
    }

    const exists = await s3.objectExists(cid);

    if (exists) {
      const data = await s3.getObjectStream(cid);
      res.setHeader('Content-Type', 'application/octet-stream');

      if (data.ContentLength) {
        res.setHeader('Content-Length', data.ContentLength);
      }

      for await (const chunk of data.Body!.transformToWebStream()) {
        res.write(chunk);
      }

      return res.end();
    }

    // optimistically, start the upstream request immediately to save time
    const upstreamRes = await fetch(config.IPFS_URL + req.url, {
      method: 'POST',
    });

    // if the IPFS hash is in our database, go ahead and proxy the request
    const batch = rdb.multi();
    batch.zScore(RKEY_FRESH_UPLOAD_HASHES, cid);
    batch.zScore(RKEY_PKG_HASHES, cid);
    batch.zScore(RKEY_EXTRA_HASHES, cid);
    const existsResult = await batch.exec();
    const hashisRepod = _.some(existsResult, _.isNumber);

    if (hashisRepod) {
      try {
        const contentLength = upstreamRes.headers.get('content-length') || '' || upstreamRes.headers.get('x-content-length');
        res.setHeader('Content-Type', 'application/octet-stream');

        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        }

        // TODO: wtp does typescript think this doesn't work. literally on mdn example https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#async_iteration_of_a_stream_using_for_await...of
        for await (const chunk of upstreamRes.body! as any) {
          res.write(Buffer.from(chunk));
        }

        return res.end();
      } catch (err) {
        console.log('cannon package download from IPFS fail', err);
        return res.status(500).end('cannon package download ipfs fail');
      }
    } else {
      // compute resulting IPFS hash from the uploaded data
      try {
        const rawData = await upstreamRes.arrayBuffer();
        const uint8Data = new Uint8Array(rawData);
        const decompressedData = uncompress(uint8Data);
        JSON.parse(decompressedData);

        // appears to be a cannon package. sendit back
        return res.end(Buffer.from(rawData));
      } catch (err) {
        // intentionally do nothing
      }
    }

    // otherwise dont return
    return res.status(404).end('unregistered ipfs data');
  });

  app.get('/health', async (_req, res) => {
    try {
      // Check Redis connection
      await rdb.ping();
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(503).json({ status: 'error', message: 'Redis connection failed' });
    }
  });

  const server = await new Promise<Server>((resolve) => {
    const server = app.listen(config.PORT, () => {
      console.log(`listening on port ${config.PORT}`);
      resolve(server);
    });
  });

  server.on('close', async () => {
    await rdb.quit();
  });

  return { app, server, rdb, s3 };
}
