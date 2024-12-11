import { getDeploymentImports, parseCid, readRawIpfs, uncompress, writeRawIpfs } from '@usecannon/builder';
import { getS3Client } from '@usecannon/repo/src/s3';
import { config } from '../config';
import { createJobs } from '../helpers/create-queue';

const s3 = getS3Client(config);

/**
 * Actions that can be performed on the queue for pinning
 * We make sure that the jobId is unique for each action to avoid creating duplicate jobs
 */
export const pinningJobs = createJobs(
  [
    {
      name: 'PIN_CID',

      action(data: { cid: string }) {
        const cid = parseCid(data.cid);
        const jobId = `PIN_CID_${cid}`;
        return { name: 'PIN_CID', data: { cid }, opts: { jobId } };
      },

      async handler(data: { cid: string }) {
        // eslint-disable-next-line no-console
        console.log('PIN_CID: ', data.cid);

        const cid = parseCid(data.cid);

        const existsOnS3 = await s3.objectExists(cid);
        const rawData = Buffer.from(
          existsOnS3
            ? await s3.getObject(cid)
            : await readRawIpfs({
                ipfsUrl: config.IPFS_URL,
                cid,
              })
        );

        if (existsOnS3) {
          await writeRawIpfs({
            ipfsUrl: config.IPFS_URL,
            data: rawData,
          });
        } else {
          await s3.putObject(cid, rawData);
        }
      },
    },
    {
      name: 'PIN_PACKAGE',

      action(data: { cid: string }) {
        const cid = parseCid(data.cid);
        const jobId = `PIN_PACKAGE_${cid}`;
        return { name: 'PIN_PACKAGE', data: { cid }, opts: { jobId } };
      },

      async handler(data: { cid: string }, { createBatch }) {
        // eslint-disable-next-line no-console
        console.log('PIN_PACKAGE: ', data.cid);

        const cid = parseCid(data.cid);

        const existsOnS3 = await s3.objectExists(cid);

        const rawPackageData = Buffer.from(
          existsOnS3
            ? await s3.getObject(cid)
            : await readRawIpfs({
                ipfsUrl: config.IPFS_URL,
                cid,
                timeout: 1000 * 30,
              })
        );

        const packageData = JSON.parse(uncompress(rawPackageData));

        const batch = createBatch();

        batch.add('PIN_CID', { cid });

        if (packageData.miscUrl) {
          batch.add('PIN_CID', { cid: packageData.miscUrl });
        }

        for (const subPackage of getDeploymentImports(packageData)) {
          batch.add('PIN_PACKAGE', { cid: subPackage.url });
        }

        await batch.exec();
      },
    },
  ],
  {}
);
