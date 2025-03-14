import { Router } from 'express';
import { getContentCID, getIpfsCid, uncompress } from '@usecannon/builder/dist/src/ipfs';
import { RKEY_FRESH_UPLOAD_HASHES, RKEY_PKG_HASHES } from '../db';
import { readRequestFile } from '../helpers/read-request-file';
import { DeploymentInfo } from '@usecannon/builder';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { Response, NextFunction } from 'express';

import type { RepoContext, RepoRequest } from '../types';
import { validateBearerToken } from '../helpers/validateBearerToken';

const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh

// Authenticate only for folder uploads (when wrap-with-directory is present)
function conditionalAuth(req: RepoRequest, res: Response, next: NextFunction, ctx: RepoContext) {
  const wrapWithDirectory = req.query['wrap-with-directory'] !== undefined;

  if (wrapWithDirectory) {
    return validateBearerToken(req, res, next, ctx);
  }

  next();
}

// Middleware for handling regular file uploads
async function handleFileUpload(req: RepoRequest, res: Response, ctx: RepoContext) {
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
    (await ctx.rdb.zScore(RKEY_FRESH_UPLOAD_HASHES, cid)) !== null || (await ctx.rdb.zScore(RKEY_PKG_HASHES, cid)) !== null;

  // if IPFS hash is not already allowed, lets see if this is a cannon package
  if (!isSavable) {
    try {
      const pkgData: DeploymentInfo = JSON.parse(uncompress(file));

      const miscIpfsHash = getIpfsCid(pkgData.miscUrl);

      if (!miscIpfsHash) {
        throw new Error(`Invalid miscUrl in package data for "${cid}": "${pkgData.miscUrl}"`);
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
}

// Middleware for handling folder uploads
async function handleFolderUpload(req: RepoRequest, res: Response, ctx: RepoContext) {
  const zipFile = await readRequestFile(req);

  if (!zipFile) {
    return res.status(400).end('no upload data');
  }

  try {
    const zipStream = Readable.from(zipFile);
    const directory = zipStream.pipe(unzipper.Parse({ forceStream: true }));

    // Collect files first to ensure we have all entries before sending
    const files = [];
    for await (const entry of directory) {
      // Process all entries, including files in subdirectories
      // The path property already includes the directory structure
      const content = await entry.buffer();

      // Skip directories themselves, but keep files within directories
      if (entry.type !== 'Directory') {
        files.push({
          path: entry.path,
          content,
        });
      }
    }

    console.log(`Processing ${files.length} files from zip`);

    // Create a single FormData for all files
    const formData = new FormData();

    // Add each file to the form data with filepath option
    files.forEach((file) => {
      const blob = new Blob([file.content]);
      formData.append('file', blob, file.path);
    });

    // For Pinata, we use their specific API endpoint
    const pinataUrl = new URL('/pinning/pinFileToIPFS', ctx.config.PINATA_URL);

    console.log('Calling Pinata URL:', pinataUrl.toString());

    // Add JWT authentication header
    const response = await fetch(pinataUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.config.PINATA_API_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata error response:', errorText);
      throw new Error(`Pinata request failed: ${response.statusText} - ${errorText}`);
    }

    // Parse Pinata response
    const result = await response.json();
    const rootHash = result.IpfsHash;

    return res.json({ 'Build hash': rootHash }).end();
  } catch (err) {
    console.error('Folder upload error:', err);
    return res.status(500).end('folder upload error');
  }
}

export function add(ctx: RepoContext) {
  const app: Router = Router();

  // Unified route that handles both regular and folder uploads
  app.post(
    '/api/v0/add',
    (req: RepoRequest, res: Response, next: NextFunction) => conditionalAuth(req, res, next, ctx),
    async (req: RepoRequest, res: Response) => {
      // Check if the request is for a folder upload
      const wrapWithDirectory = req.query['wrap-with-directory'] !== undefined;

      if (wrapWithDirectory) {
        // Use folder upload logic
        return handleFolderUpload(req, res, ctx);
      } else {
        // Use file upload logic
        return handleFileUpload(req, res, ctx);
      }
    }
  );

  return app;
}
