import { distance } from 'fastest-levenshtein';
import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import { NotFoundError, ServerError } from '../errors';
import { parsePackageName, parseTextQuery } from '../helpers';
import { useRedis } from '../redis';
import { ApiDocument, ApiNamespace } from '../types';
import * as db from './keys';
import { findPackageByTag, RedisDocument, transformPackage, transformPackageWithTag } from './transformers';

import type { Address } from 'viem';

const PER_PAGE = 500;

export async function queryPackages(params: { query: string; includeNamespaces?: boolean }) {
  const redis = await useRedis();
  const batch = redis.multi();

  batch.ft.search(db.RKEY_PACKAGE_SEARCHABLE, params.query, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: 0, size: PER_PAGE },
  });

  if (params.includeNamespaces) {
    batch.ft.aggregate(db.RKEY_PACKAGE_SEARCHABLE, params.query, {
      STEPS: [
        {
          type: AggregateSteps.GROUPBY,
          properties: '@name',
          REDUCE: {
            type: AggregateGroupByReducers.COUNT,
            AS: 'count',
          },
        },
      ],
    });
  }

  const [packagesResults, namespacesResults] = (await batch.exec()) as any[];

  const data: ApiDocument[] = [];

  if (!packagesResults) {
    throw new ServerError('Could not connect to packages');
  }

  if (namespacesResults) {
    for (const namespace of namespacesResults.results) {
      data.push({
        type: 'namespace',
        name: namespace.name,
        count: namespace.count,
      } satisfies ApiNamespace);
    }
  }

  for (const { value } of packagesResults.documents) {
    const item = value as unknown as RedisDocument;

    if (item.type === 'package') {
      data.push(transformPackage(item));
    } else if (item.type === 'tag') {
      const pkg = findPackageByTag(packagesResults.documents as any, item);

      if (!pkg) {
        // eslint-disable-next-line no-console
        console.error(new Error(`Package not found for tag "${JSON.stringify(item)}"`));
        continue;
      }

      data.push(transformPackageWithTag(pkg, item));
    }
  }

  return {
    total: packagesResults.total + (namespacesResults?.total || 0),
    data,
  } satisfies { total: number; data: ApiDocument[] };
}

export async function findPackagesByName(params: { packageName: string }) {
  const packageName = parsePackageName(params.packageName);
  const results = await queryPackages({ query: `@exactName:{${packageName}}` });

  if (!results.total) {
    throw new NotFoundError(`Package "${packageName}" not found`);
  }

  return results;
}

export async function searchPackages(params: { query: any; chainIds?: number[]; includeNamespaces: boolean }) {
  const q = parseTextQuery(params.query);

  const queries: string[] = [];

  if (q) {
    const words = q.split('-');
    queries.push(`(${[...words.map((w) => `@name:*${w}*`), ...words.map((w) => `@name:%${w}%`)].join(' | ')})`);
  }

  if (params.chainIds?.length) queries.push(`@chainId:{${params.chainIds.join('|')}}`);

  const result = await queryPackages({
    query: queries.join(',') || '*',
    includeNamespaces: params.includeNamespaces,
  });

  // Sort results by showing first the more close ones to the expected one
  if (q) {
    result.data = result.data.sort((a, b) => {
      return distance(a.name, q) - distance(b.name, q);
    });
  }

  return result;
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

export async function searchByAddress(address: Address) {
  // empty
}
