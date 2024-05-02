import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as db from './db';
import { NotFoundError } from './errors';
import { parsePackageName, parsePage } from './helpers';
import { useRedis } from './redis';
import { ApiPackage, ApiPagination } from './types';

export async function queryPackages(params: { query: string; page: any; per_page?: number }) {
  const page = parsePage(params.page);
  const redis = await useRedis();
  const per_page = params.per_page || 300;

  const results = await redis.ft.search(db.RKEY_PACKAGE_SEARCHABLE, params.query, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: (page - 1) * per_page, size: per_page },
  });

  const data: ApiPackage[] = (results.documents || []).map(
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

export async function findPackagesByName(params: { packageName: string; page: any }) {
  const packageName = parsePackageName(params.packageName);
  const results = await queryPackages({ query: `@name:${packageName}`, page: params.page });

  if (!results.total) {
    throw new NotFoundError(`Package "${packageName}" not found`);
  }

  return results;
}

export async function searchPackages(params: { query: string; page: any }) {
  const query = params.query ? `@name:*${params.query}*` : '*';

  return queryPackages({
    query,
    page: params.page,
    per_page: 100,
  });
}

export async function getChaindIds() {
  const redis = await useRedis();
  // ft.aggregate reg:packages '*' groupby 1 @chainId

  const results = (await redis.ft.aggregate(db.RKEY_PACKAGE_SEARCHABLE, '*', {
    STEPS: [
      {
        type: AggregateSteps.GROUPBY,
        properties: '@chainId',
        REDUCE: {
          type: AggregateGroupByReducers.COUNT,
        },
      },
    ],
  })) as any;

  return {
    total: results.total as number,
    data: results.results.map((result: any) => result.chainId).filter(Boolean) as number[],
  };
}
