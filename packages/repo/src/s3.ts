import { S3 } from '@aws-sdk/client-s3';

import type { Config } from './config';

export function getS3Client(config: Config) {
  const client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_KEY,
      secretAccessKey: config.S3_SECRET,
    },
  });

  return {
    client,

    async objectExists(key: string) {
      try {
        await client.headObject({ Bucket: config.S3_BUCKET, Key: key });
        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'NotFound') {
          return false;
        }

        throw err;
      }
    },
  };
}
