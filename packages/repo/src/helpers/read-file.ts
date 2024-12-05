import consumers from 'stream/consumers';

import type { Express } from 'express';

export async function readFile(req: Express.Request) {
  if (!req.busboy) return null;

  return new Promise<Buffer>((resolve, reject) => {
    let file: Buffer;

    req.busboy.on('file', async (_, fileStream) => {
      try {
        file = await consumers.buffer(fileStream);
      } catch (err) {
        reject(err);
      }
    });

    req.busboy.on('error', (err) => {
      reject(err);
    });

    req.busboy.on('finish', () => {
      if (!file) return reject(new Error('Could not read file'));
      resolve(file);
    });
  });
}
