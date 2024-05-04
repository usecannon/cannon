import { PackageReference } from '@usecannon/builder';
import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as viem from 'viem';
import * as keys from '../db/keys';
import { useRedis } from '../redis';
import { ApiContract } from '../types';

async function _queryContracts(params: { query: string; limit?: number }) {
  const redis = await useRedis();

  const results = (await redis.ft.aggregate(keys.RKEY_ABI_SEARCHABLE, params.query, {
    LOAD: { identifier: '@package' },
    STEPS: [
      {
        type: AggregateSteps.GROUPBY,
        properties: ['@contractName', '@package', '@chainId', '@address'],
        REDUCE: {
          type: AggregateGroupByReducers.FIRST_VALUE,
          property: '@contractName',
        },
      },
    ],
  })) as {
    total: number;
    results: { contractName: string; package: string; chainId: string; address: string }[];
  };

  const data: ApiContract[] = results.results.map((doc) => {
    const ref = new PackageReference(doc.package);
    return {
      type: 'contract',
      address: viem.getAddress(doc.address),
      name: doc.contractName,
      chainId: Number.parseInt(doc.chainId),
      packageName: ref.name,
      preset: ref.preset,
      version: ref.version,
    } satisfies ApiContract;
  });

  return {
    total: data.length,
    data,
  } satisfies {
    total: number;
    data: ApiContract[];
  };
}

export async function findContractsByAddress(params: { address: viem.Address; limit: number }) {
  const contractAddress = viem.getAddress(params.address);
  return _queryContracts({ query: `@address:{${contractAddress}}`, limit: params.limit });
}

export async function searchContracts(params: { query: string; limit: number }) {
  return _queryContracts({
    query: `@contractName:'${params.query}' | @contractName:${params.query}* | @contractName:*${params.query}*`,
    limit: params.limit,
  });
}
