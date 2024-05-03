import { PackageReference } from '@usecannon/builder';
import { distance } from 'fastest-levenshtein';
import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as viem from 'viem';
import * as keys from '../db/keys';
import {
  findPackageByTag,
  RedisDocument,
  RedisPackage,
  RedisTag,
  transformPackage,
  transformPackageWithTag,
} from '../db/transformers';
import { NotFoundError, ServerError } from '../errors';
import { isRedisTagOfPackage, parsePackageName, parseTextQuery } from '../helpers';
import { useRedis } from '../redis';
import { ApiContract, ApiDocument, ApiNamespace, ApiPackage } from '../types';
import { getChainIds } from './chains';

const DEFAULT_LIMIT = 500;

async function _queryPackages(params: { query: string; limit?: number; includeNamespaces?: boolean }) {
  const redis = await useRedis();
  const batch = redis.multi();

  batch.ft.search(keys.RKEY_PACKAGE_SEARCHABLE, params.query, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'DESC' },
    LIMIT: { from: 0, size: params.limit || DEFAULT_LIMIT },
  });

  if (params.includeNamespaces) {
    batch.ft.aggregate(keys.RKEY_PACKAGE_SEARCHABLE, params.query, {
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
      if (!namespace.name) continue;

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
  } satisfies {
    total: number;
    data: ApiDocument[];
  };
}

export async function findPackagesByName(params: { packageName: string }) {
  const packageName = parsePackageName(params.packageName);
  const results = await _queryPackages({ query: `@exactName:{${packageName}}` });

  if (!results.total) {
    throw new NotFoundError(`Package "${packageName}" not found`);
  }

  return results;
}

export async function findPackagesByRef(params: { packageRef: string }) {
  const redis = await useRedis();
  const chainIds = await getChainIds();

  const ref = new PackageReference(params.packageRef);

  const batch = redis.multi();

  for (const chainId of chainIds) {
    batch.hGetAll(`${keys.RKEY_PACKAGE_SEARCHABLE}:${ref.fullPackageRef}#${chainId}`);
  }

  const results: (RedisPackage | RedisTag)[] = ((await batch.exec()) as any).filter((doc: any) => !!doc?.name);

  const tags = results.filter((doc) => doc.type === 'tag') as RedisTag[];
  const tagsBatch = redis.multi();
  for (const tag of tags) {
    const { fullPackageRef } = PackageReference.from(tag.name, tag.versionOfTag, tag.preset);
    tagsBatch.hGetAll(`${keys.RKEY_PACKAGE_SEARCHABLE}:${fullPackageRef}#${tag.chainId}`);
  }

  const tagsResults: RedisPackage[] = ((await tagsBatch.exec()) as any).filter((doc: any) => !!doc?.name);

  const data = results
    .map((doc) => {
      if (doc.type === 'tag') {
        const pkg = tagsResults.find((pkg) => isRedisTagOfPackage(pkg, doc));
        return pkg && transformPackage(pkg);
      }

      return doc;
    })
    .filter((doc) => !!doc) as ApiPackage[];

  return {
    total: data.length,
    data,
  } satisfies {
    total: number;
    data: ApiPackage[];
  };
}

export async function searchPackages(params: {
  query: any;
  limit?: number;
  chainIds?: number[];
  includeNamespaces: boolean;
}) {
  const q = parseTextQuery(params.query);

  const queries: string[] = [];

  if (q) {
    const words = q.split('-');
    queries.push(`(${[...words.map((w) => `@name:*${w}*`), ...words.map((w) => `@name:%${w}%`)].join(' | ')})`);
  }

  if (params.chainIds?.length) queries.push(`@chainId:{${params.chainIds.join('|')}}`);

  const result = await _queryPackages({
    query: queries.join(',') || '*',
    limit: params.limit,
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

export async function findContractsByAddress(address: viem.Address) {
  const redis = await useRedis();
  const contractAddress = viem.getAddress(address);

  const chainIds = await getChainIds();

  const batch = redis.multi();

  for (const chainId of chainIds) {
    batch.hGet(`${keys.RKEY_ADDRESS_TO_PACKAGE}:${chainId}`, contractAddress.toLowerCase());
  }

  const results = await batch.exec();

  const contractNameBatch = redis.multi();

  for (const [index, packageRef] of Object.entries(results)) {
    if (!packageRef) continue;
    const chainId = chainIds[index as any];
    contractNameBatch.ft.aggregate(keys.RKEY_ABI_SEARCHABLE, `@address:{${contractAddress}} @chainId:{${chainId}}`, {
      STEPS: [
        {
          type: AggregateSteps.GROUPBY,
          properties: '@contractName',
          REDUCE: {
            type: AggregateGroupByReducers.COUNT_DISTINCT,
            property: '@contractName',
          },
        },
      ],
    });
  }

  const contractNameResults = (await contractNameBatch.exec()) as any;

  const data: ApiContract[] = [];

  for (const [index, packageRef] of Object.entries(results)) {
    if (!packageRef) continue;
    const chainId = chainIds[index as any];
    const { name, preset, version } = new PackageReference(packageRef.toString());

    const contractName = contractNameResults[index as any]?.results?.[0]?.contractName || 'Contract';

    data.push({
      type: 'contract',
      address: contractAddress,
      contractName,
      chainId,
      name,
      preset,
      version,
    });
  }

  return {
    total: 0,
    data,
  } satisfies {
    total: number;
    data: ApiContract[];
  };
}
