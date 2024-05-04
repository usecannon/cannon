import { PackageReference } from '@usecannon/builder';
import * as viem from 'viem';
import * as keys from '../db/keys';
import { useRedis } from '../redis';
import { ApiFunction } from '../types';

async function _queryContracts(params: { query: string; limit?: number }) {
  const redis = await useRedis();

  const results = (await redis.ft.search(keys.RKEY_ABI_SEARCHABLE, params.query)) as any;

  const data: ApiFunction[] = results.documents.map(({ value }: any) => {
    const ref = new PackageReference(value.package);
    return {
      type: 'function',
      name: value.name,
      selector: value.selector,
      contractName: value.contractName,
      chainId: Number.parseInt(value.chainId),
      address: viem.getAddress(value.address),
      packageName: ref.name,
      preset: ref.preset,
      version: ref.version,
    } satisfies ApiFunction;
  });

  return {
    total: data.length,
    data,
  } satisfies {
    total: number;
    data: ApiFunction[];
  };
}

export async function findFunctionsBySelector(params: { selector: viem.Hex; limit: number }) {
  return _queryContracts({ query: `@selector:{${params.selector}}`, limit: params.limit });
}

export async function searchFunctions(params: { query: string; limit: number }) {
  return _queryContracts({
    query: `@name:'${params.query}' | @name:${params.query}* | @name:*${params.query}*`,
    limit: params.limit,
  });
}
