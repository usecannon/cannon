import _ from 'lodash';
import express from 'express';
import morgan from 'morgan';
import connectBusboy from 'connect-busboy';
import pako from 'pako';
import consumers from 'stream/consumers';
import Hash from 'typestub-ipfs-only-hash';
import { getDb, RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES, RKEY_EXTRA_HASHES } from './db';
import { ChainDefinition, DeploymentInfo } from '@usecannon/builder';

const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh

if (!process.env.REDIS_URL) {
  throw new Error('please set REDIS_URL');
}

if (!process.env.UPSTREAM_IPFS_URL) {
  throw new Error('please set UPSTREAM_IPFS_URL');
}

const app = express();
const port = process.env.PORT || '3000';

const upstreamIpfs = process.env.UPSTREAM_IPFS_URL;

app.use(morgan('short'));
app.use(connectBusboy({ immediate: true }));

app.post('/api/v0/add', async (req, res) => {
  // check to ensure the uploaded artifact is a cannon package
  if (req.busboy) {
    let fileReceived = false;
    req.busboy.on('file', async (_name, stream) => {
      fileReceived = true;
      // compute resulting IPFS hash from the uploaded data
      const rawData = await consumers.buffer(stream);
      const ipfsHash = await Hash.of(rawData);

      const now = Math.floor(Date.now() / 1000) + RKEY_FRESH_GRACE_PERIOD;

      const rdb = await getDb(process.env.REDIS_URL!);

      let isSavable =
        (await rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, ipfsHash)) !== null ||
        (await rdb.zScore(RKEY_PKG_HASHES, ipfsHash)) !== null;

      // if IPFS hash is not already allowed, lets see if this is a cannon package
      if (!isSavable) {
        try {
          const pkgData: DeploymentInfo = JSON.parse(pako.inflate(rawData, { to: 'string' }));
          //const def = new ChainDefinition(pkgData.def);

          // package is valid. Add to upload hashes
          isSavable = true;

          const miscIpfsHash = _.last(pkgData.miscUrl.split('://'))!;

          // as a special step here, we also save the misc url (we dont want to save it anywhere else)
          await rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: miscIpfsHash }, { NX: true });
        } catch (err) {
          // pkg is not savable
          console.log('cannon package reading fail', err);
          return res.status(400).end('does not appear to be cannon package');
        }
      }

      if (isSavable) {
        // ensure the file is marked as a fresh upload
        await rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: ipfsHash }, { NX: true });

        // TODO: do we need to sanitize the upstream upload ipfs url?
        await fetch(upstreamIpfs + req.url, {
          method: 'POST',
          body: req.body,
        });
      }
    });
    req.busboy.on('finish', () => {
      if (!fileReceived) {
        res.status(400).end('no upload data');
      }
    });
  } else {
    res.status(400).end('no upload data');
  }
});

app.post('/api/v0/get', async (req, res) => {
  const ipfsHash = req.query.arg as string;
  // if the IPFS hash is in our database, go ahead and proxy the request
  const rdb = await getDb(process.env.REDIS_URL!);
  const batch = rdb.multi();
  batch.zScore(RKEY_FRESH_UPLOAD_HASHES, ipfsHash);
  batch.zScore(RKEY_PKG_HASHES, ipfsHash);
  batch.zScore(RKEY_EXTRA_HASHES, ipfsHash);
  const existsResult = await batch.exec();
  const hashIsSaved = _.some(existsResult, _.isNumber());
  if (hashIsSaved) {
    const upstreamRes = await fetch(upstreamIpfs + req.url, {
      method: 'POST',
    });

    // TODO: wtp does typescript think this doesn't work. literally on mdn example https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#async_iteration_of_a_stream_using_for_await...of
    for await (const chunk of upstreamRes.body! as any) {
      res.send(chunk);
    }

    res.end();
  }

  // otherwise dont return
  res.status(404).end('unregistered ipfs data');
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

// IPFS
