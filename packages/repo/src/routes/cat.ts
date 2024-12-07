import { Router } from 'express';
import _ from 'lodash';
import { uncompress, parseIpfsCid, parseIpfsUrl } from '@usecannon/builder/dist/src/ipfs';
import { RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES, RKEY_EXTRA_HASHES } from '../db';
import { RepoContext } from '../types';

export function cat(ctx: RepoContext) {
  const app: Router = Router();

  app.head('/api/v0/cat', async (req, res) => {
    const cid = parseIpfsCid(req.query.arg);

    if (!cid) {
      return res.status(400).end();
    }

    const exists = await ctx.s3.objectExists(cid);

    if (exists) {
      return res.status(200).end();
    }

    return res.status(404).end();
  });

  app.post('/api/v0/cat', async (req, res) => {
    const cid = parseIpfsCid(req.query.arg);

    if (!cid) {
      // the exact error message for this 400 error is necessary for backwards compatibility
      return res.status(400).end('argument "ipfs-path" is required');
    }

    const exists = await ctx.s3.objectExists(cid);

    if (exists) {
      const data = await ctx.s3.getObjectStream(cid);
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
    const ipfsUrl = new URL(`/api/v0/cat?arg=${cid}`, ctx.config.IPFS_URL);
    const upstreamRes = await fetch(ipfsUrl, {
      method: 'POST',
    });

    // if the IPFS hash is in our database, go ahead and proxy the request
    const batch = ctx.rdb.multi();
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

        if (!upstreamRes.body) {
          return res.status(404).end('unregistered ipfs data');
        }

        for await (const chunk of upstreamRes.body) {
          res.write(chunk);
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
        const pkgData = JSON.parse(decompressedData);
        const miscIpfsHash = parseIpfsUrl(pkgData.miscUrl);

        if (!miscIpfsHash) {
          throw new Error(`Invalid package data for "${cid}"`);
        }

        // appears to be a cannon package. sendit back
        return res.end(Buffer.from(rawData));
      } catch (err) {
        console.error(err);
        return res.status(404).end('unregistered ipfs data');
      }
    }
  });

  return app;
}
