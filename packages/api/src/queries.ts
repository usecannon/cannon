import * as viem from 'viem';
import * as db from './db';
import { parseAddresses, parsePackageName, parsePage } from './helpers';
import { useRedis } from './redis';
import { ApiPackage, ApiPackageTag } from './types';

export async function findPackageByName(params: { packageName: string; page: any }) {
  const packageName = parsePackageName(params.packageName);
  const page = parsePage(params.page);

  const redis = await useRedis();
  const per_page = 300;

  const batch = redis.multi();

  batch.ft.search(db.RKEY_PACKAGE_SEARCHABLE, `@name:${packageName}`, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: 0, size: 1 },
  });
  batch.ft.search(db.RKEY_PACKAGE_SEARCHABLE, `@name:${packageName}`, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: page * per_page, size: per_page },
  });
  batch.hGet(db.RKEY_PACKAGE_OWNERS, packageName);
  batch.hGet(`${db.RKEY_PACKAGE_PUBLISHERS}:1`, packageName);
  batch.hGet(`${db.RKEY_PACKAGE_PUBLISHERS}:10`, packageName);

  const [resultNewestPackage, resultPackages, resultOwner, resultPublishers1, resultPublishers10] =
    (await batch.exec()) as any[];

  const total = (resultPackages?.total as number) || 0;
  const last_published = total > 0 ? resultNewestPackage?.documents?.[0].timestamp : 0 || 0;

  const owner = resultOwner?.toString() || resultNewestPackage?.documents?.[0]?.owner || viem.zeroAddress;

  const publishers: viem.Address[] = [];
  for (const publisher of parseAddresses(resultPublishers1)) {
    if (!publishers.includes(publisher)) publishers.push(publisher);
  }

  for (const publisher of parseAddresses(resultPublishers10)) {
    if (!publishers.includes(publisher)) publishers.push(publisher);
  }

  const tagsResults: ApiPackageTag[] =
    total === 0
      ? []
      : resultPackages.documents.map(
          (tag: any) =>
            ({
              version: tag.value.version,
              preset: tag.value.preset,
              chainId: Number.parseInt(tag.value.chainId),
              deployUrl: tag.value.deployUrl,
              metaUrl: tag.value.metaUrl,
              timestamp: tag.value.timestamp,
            } satisfies ApiPackageTag)
        );

  return {
    name: packageName,
    owner,
    publishers,
    last_published,
    tags: {
      total,
      page,
      per_page,
      results: tagsResults,
    },
  } satisfies ApiPackage;
}
