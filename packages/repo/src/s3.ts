import { S3 } from '@aws-sdk/client-s3';
import memoize from 'memoizee';

export type S3Client = ReturnType<typeof getS3Client>;

interface Params {
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_FOLDER: string;
  S3_KEY: string;
  S3_SECRET: string;
}

export function getS3Client(config: Params, cache = 10_000) {
  const client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_KEY,
      secretAccessKey: config.S3_SECRET,
    },
  });

  const cacheOptions = {
    length: 1,
    primitive: true,
    promise: true,
    max: cache,
  };

  const s3 = {
    client,

    objectExists: memoize(async function objectExists(key: string) {
      console.log('[s3][objectExists]', key);

      try {
        await client.headObject({ Bucket: config.S3_BUCKET, Key: `${config.S3_FOLDER}/${key}` });
        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'NotFound') {
          return false;
        }

        throw err;
      }
    }, cacheOptions),

    putObject: memoize(async function putObject(key: string, data: Buffer) {
      console.log('[s3][putObject]', key);

      const res = await client.putObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
        Body: data,
        ContentType: 'application/json',
      });

      await s3.objectExists.delete(key);
      await s3.getObject.delete(key);

      return res;
    }, cacheOptions),

    getObject: memoize(async function getObject(key: string) {
      console.log('[s3][getObject]', key);

      const res = await client.getObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
      });

      if (!res.Body) {
        throw new Error(`no response body for "${key}"`);
      }

      return res.Body!.transformToByteArray();
    }, cacheOptions),

    async clearCache() {
      s3.objectExists.clear();
      s3.putObject.clear();
      s3.getObject.clear();
    },
  };

  return s3;
}
