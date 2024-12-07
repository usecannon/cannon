import fs from 'node:fs';
import S3rver from 's3rver';
import tmp from 'tmp';
import { getPort } from './get-port';

tmp.setGracefulCleanup();

/**
 * S3 server mock, intended for tests
 */
export async function s3ServerMock(bucketName: string) {
  const address = '127.0.0.1';
  const port = await getPort();
  const tmpDirectory = tmp.dirSync({ unsafeCleanup: true });

  let server;

  try {
    server = new S3rver({
      port,
      address,
      silent: false,
      directory: tmpDirectory.name,
      configureBuckets: [
        {
          name: bucketName,
          configs: [
            fs.readFileSync(require.resolve('s3rver/example/cors.xml')),
            fs.readFileSync(require.resolve('s3rver/example/website.xml')),
          ],
        },
      ],
    });
  } catch (err) {
    console.error('Error starting S3 server', err);
    throw err;
  }

  await server.run();

  return {
    S3_ENDPOINT: `http://${address}:${port}`,
    S3_REGION: 'us-east-1',
    S3_BUCKET: bucketName,
    S3_KEY: 'S3RVER',
    S3_SECRET: 'S3RVER',

    async reset() {
      server.reset();
      await server.configureBuckets();
    },

    close: server.close.bind(server),
  };
}
