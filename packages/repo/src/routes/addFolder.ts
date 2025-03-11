import { Router } from 'express';
import * as unzipper from 'unzipper';
import type { RepoContext, RepoRequest } from '../types';
import { Readable } from 'stream';
import { readRequestFile } from '../helpers/read-request-file';

export function addFolder(ctx: RepoContext) {
  const app: Router = Router();

  app.post('/api/v0/addFolder', async (req: RepoRequest, res) => {
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
      const pinataUrl = new URL('/pinning/pinFileToIPFS', ctx.config.BUILD_PINATA_URL);

      console.log('Calling Pinata URL:', pinataUrl.toString());

      // Add JWT authentication header
      const response = await fetch(pinataUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ctx.config.BUILD_PINATA_API_JWT}`,
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
  });

  return app;
}
