import { S3 } from '@aws-sdk/client-s3';

export type S3Client = ReturnType<typeof getS3Client>;

interface Params {
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_FOLDER: string;
  S3_KEY: string;
  S3_SECRET: string;
}

export function getS3Client(config: Params) {
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
      const res = await client.putObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
        Body: data,
        ContentType: 'application/json',
      });

      return res;
    },

    async getObjectStream(key: string) {
      const res = await client.getObject({
        Bucket: config.S3_BUCKET,
        Key: `${config.S3_FOLDER}/${key}`,
      });

      if (!res.Body) {
        throw new Error(`no response body for "${key}"`);
      }

      return res;
    },

    async getObject(key: string) {
      const res = await s3.getObjectStream(key);
      return res.Body!.transformToByteArray();
    },
  };

  return s3;
}
