import { after } from 'node:test';
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
export async function s3ServerMock() {
  const address = '127.0.0.1';
  const port = await getPort();
  const tmpDirectory = tmp.dirSync({ unsafeCleanup: true });

  const server = new S3rver({
    port,
    address,
    silent: false,
    directory: tmpDirectory.name,
  });

  servers.push(server);

  await server.run();

  return {
    s3Url: `http://${address}:${port}`,

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
