import * as db from './db';
import { NotFoundError } from './errors';
import { parsePackageName, parsePage } from './helpers';
import { useRedis } from './redis';
import { ApiPackage, ApiPagination } from './types';

export async function findPackagesByName(params: { packageName: string; page: any }) {
  const packageName = parsePackageName(params.packageName);
  const page = parsePage(params.page);

  const redis = await useRedis();
  const per_page = 300;

  const results = await redis.ft.search(db.RKEY_PACKAGE_SEARCHABLE, `@name:${packageName}`, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: page * per_page, size: per_page },
  });

  if (!results || !results.total) {
    throw new NotFoundError(`Package "${packageName}" not found`);
  }

  const data: ApiPackage[] = results.documents.map(
    (tag: any) =>
      ({
        type: 'package',
        name: tag.value.name,
        version: tag.value.version,
        preset: tag.value.preset,
        chainId: Number.parseInt(tag.value.chainId),
        deployUrl: tag.value.deployUrl,
        metaUrl: tag.value.metaUrl,
        timestamp: tag.value.timestamp,
        publisher: tag.value.owner,
      } satisfies ApiPackage)
  );

  return {
    total: results.total,
    page,
    per_page,
    data,
  } satisfies ApiPagination & { data: ApiPackage[] };
}

// export async function searchPackages(params: { packageName: string; page: any }) {}
