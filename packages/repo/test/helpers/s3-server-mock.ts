import { after } from 'node:test';
import fs from 'node:fs';
import { readdir } from 'node:fs/promises';
import { getPort } from 'get-port-please';
import S3rver from 's3rver';
import tmp from 'tmp';

tmp.setGracefulCleanup();

const servers: S3rver[] = [];

after(async function () {
  await Promise.all(servers.map((server) => server.close()));
});

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

  servers.push(server);

  await server.run();

  return {
    S3_ENDPOINT: `http://${address}:${port}`,
    S3_REGION: 'us-east-1',
    S3_KEY: 'S3RVER',
    S3_SECRET: 'S3RVER',

    async s3List() {
      const files = await readdir(tmpDirectory.name, {
        withFileTypes: true, // Get Dirent objects
      });

      return (
        files
          // .filter((file) => file.isFile()) // Only files, no directories
          .map((file) => file.name)
      );
    },
  };
}
