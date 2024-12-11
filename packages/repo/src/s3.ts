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

  const s3 = {
    client,

    async objectExists(key: string) {
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
    },

    async putObject(key: string, data: Buffer) {
      console.log('[s3][putObject]', key);

      const res = await client.putObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
        Body: data,
        ContentType: 'application/json',
      });

      return res;
    },

    async getObject(key: string) {
      console.log('[s3][getObject]', key);

      const res = await client.getObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
      });

      if (!res.Body) {
        throw new Error(`no response body for "${key}"`);
      }

      return res.Body!.transformToByteArray();
    },

    clearCache() {
      (s3.objectExists as any).clear?.();
      (s3.putObject as any).clear?.();
      (s3.getObject as any).clear?.();
    },
  };

  if (typeof cache === 'number' && cache > 0) {
    s3.objectExists = memoize(s3.objectExists, {
      length: 1,
      primitive: true,
      promise: true,
      max: cache,
    });

    s3.putObject = memoize(s3.putObject, {
      length: 1,
      primitive: true,
      promise: true,
      max: cache,
    });

    s3.getObject = memoize(s3.getObject, {
      length: 1,
      primitive: true,
      promise: true,
      max: cache,
    });
  }

  return s3;
}
