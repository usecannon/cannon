import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as db from './db';
import { NotFoundError } from './errors';
import { parsePackageName, parsePage, parseQuery } from './helpers';
import { useRedis } from './redis';
import { ApiPackage, ApiPagination, IpfsUrl } from './types';

import type { Address } from 'viem';

export async function queryPackages(params: { query: string; page: any; per_page?: number }) {
  const page = parsePage(params.page);
  const redis = await useRedis();
  const per_page = params.per_page || 1000;

  const results = await redis.ft.search(db.RKEY_PACKAGE_SEARCHABLE, params.query, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: (page - 1) * per_page, size: per_page },
  });

  const data: ApiPackage[] = [];

  for (const { value } of results.documents) {
    if (value.type === 'package') {
      data.push({
        type: 'package',
        name: value.name as string,
        version: value.version as string,
        preset: value.preset as string,
        chainId: Number.parseInt(value.chainId as string),
        deployUrl: value.deployUrl as IpfsUrl,
        metaUrl: value.metaUrl as IpfsUrl,
        miscUrl: value.miscUrl as IpfsUrl,
        timestamp: Number.parseInt(value.timestamp as string),
        publisher: value.owner as Address,
      } satisfies ApiPackage);
    } else if (value.type === 'tag') {
      const pkg = results.documents.find(
        (item) =>
          item.value.name === value.name &&
          item.value.preset === value.preset &&
          item.value.chainId === value.chainId &&
          item.value.version === value.versionOfTag
      );

      if (!pkg) {
        // eslint-disable-next-line no-console
        console.error(new Error(`Package not found for tag "${JSON.stringify(value)}"`));
        continue;
      }

      data.push({
        type: 'package',
        name: value.name as string,
        version: value.tag as string,
        preset: value.preset as string,
        chainId: Number.parseInt(value.chainId as string),
        deployUrl: pkg.value.deployUrl as IpfsUrl,
        metaUrl: pkg.value.metaUrl as IpfsUrl,
        miscUrl: pkg.value.miscUrl as IpfsUrl,
        timestamp: Number.parseInt(value.timestamp as string),
        publisher: pkg.value.owner as Address,
      } satisfies ApiPackage);
    }
  }

  return {
    total: results.total,
    page,
    per_page,
    data,
  } satisfies ApiPagination & { data: ApiPackage[] };
}

export async function findPackagesByName(params: { packageName: string; page: any }) {
  const packageName = parsePackageName(params.packageName);
  const results = await queryPackages({ query: `@exactName:{${packageName}}`, page: params.page });

  if (!results.total) {
    throw new NotFoundError(`Package "${packageName}" not found`);
  }

  return results;
}

export async function searchPackages(params: { query: any; chainIds?: number[]; page: any }) {
  const q = parseQuery(params.query);

  const queries: string[] = [];

  if (q) queries.push(`@name:%${q}%`);
  if (params.chainIds?.length) queries.push(`@chainId:{${params.chainIds.join('|')}}`);

  return queryPackages({
    query: queries.join(',') || '*',
    page: params.page,
  });
}

export async function getChaindIds() {
  const redis = await useRedis();

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
