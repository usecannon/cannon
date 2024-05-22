import * as viem from 'viem';
import * as keys from '../db/keys';
import { transformFunction } from '../db/transformers';
import { useRedis } from '../redis';
import { ApiFunction, RedisFunction } from '../types';

async function _queryAbiFunctions(params: { query: string; limit?: number }) {
  const redis = await useRedis();

  const results = (await redis.ft.search(keys.RKEY_ABI_SEARCHABLE, params.query)) as unknown as {
    total: number;
    documents: { value: RedisFunction }[];
  };

  const data: ApiFunction[] = [];

  for (const { value } of results.documents) {
    const parsed = transformFunction(value);

    if (!parsed) {
      // eslint-disable-next-line no-console
      console.warn(
        new Error(
          `Could not parse "${value && JSON.stringify(value)}" on query "FT.SEARCH ${keys.RKEY_ABI_SEARCHABLE} ${
            params.query
          }"`
        )
      );
      continue;
    }

    data.push(parsed);
  }

  return {
    total: data.length,
    data,
  } satisfies {
    total: number;
    data: ApiFunction[];
  };
}

export async function findFunctionsBySelector(params: { selector: viem.Hex; limit: number }) {
  return _queryAbiFunctions({ query: `@selector:{${params.selector}}`, limit: params.limit });
}

export async function searchFunctions(params: { query: string; limit: number }) {
  return _queryAbiFunctions({
    query: `@name:'${params.query}' | @name:${params.query}* | @name:*${params.query}*`,
    limit: params.limit,
  });
}
