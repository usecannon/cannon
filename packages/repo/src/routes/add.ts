import { Router } from 'express';
import _ from 'lodash';
import { getContentCID, parseIpfsUrl, uncompress } from '@usecannon/builder/dist/src/ipfs';
import { RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES } from '../db';
import { RepoContext } from '../types';
import { readRequestFile } from '../helpers/read-request-file';
import { DeploymentInfo } from '@usecannon/builder';

const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh

export function add(ctx: RepoContext) {
  const app: Router = Router();

  app.post('/api/v0/add', async (req: Express.Request, res) => {
    const file = await readRequestFile(req);

    if (!file) {
      return res.status(400).end('no upload data');
    }

    const cid = await getContentCID(file);

    const exists = await ctx.s3.objectExists(cid);

    if (exists) {
      return res.json({ Hash: cid }).end();
    }

    const now = Math.floor(Date.now() / 1000) + RKEY_FRESH_GRACE_PERIOD;

    const isSavable =
      (await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, cid)) !== null ||
      (await ctx.rdb.zScore(RKEY_PKG_HASHES, cid)) !== null;

    // if IPFS hash is not already allowed, lets see if this is a cannon package
    if (!isSavable) {
      try {
        const pkgData: DeploymentInfo = JSON.parse(uncompress(file));

        const miscIpfsHash = parseIpfsUrl(pkgData.miscUrl);

        if (!miscIpfsHash) {
          throw new Error(`Invalid package data for "${cid}"`);
        }

        // as a special step here, we also save the misc url (we dont want to save it anywhere else)
        await ctx.rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: miscIpfsHash }, { NX: true });
      } catch (err) {
        // pkg is not savable
        console.log('cannon package reading fail', err);
        return res.status(400).end('does not appear to be cannon package');
      }
    }

    // ensure the file is marked as a fresh upload
    await ctx.rdb.zAdd(RKEY_FRESH_UPLOAD_HASHES, { score: now, value: cid }, { NX: true });

    try {
      await ctx.s3.putObject(cid, file);
      return res.json({ Hash: cid }).end();
    } catch (err) {
      console.error('cannon package upload to S3 fail', err);
      return res.status(500).end('file write error');
    }
  });

  return app;
}
