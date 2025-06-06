import * as viem from 'viem';
import * as keys from '../db/keys';
import { transformFunction } from '../db/transformers';
import { useRedis } from '../redis';
import { ApiSelectorResult, RedisFunction } from '../types';

async function _querySelectors(params: { query: string; limit?: number }) {
  const redis = await useRedis();

  const results = (await redis.ft.search(keys.RKEY_ABI_SEARCHABLE, params.query, {
    SORTBY: { BY: 'timestamp', DIRECTION: 'ASC' },
  })) as unknown as {
    total: number;
    documents: { value: RedisFunction }[];
  };

  const data: ApiSelectorResult[] = [];

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
    data: ApiSelectorResult[];
  };
}

export async function findSelector(params: { selector: viem.Hex; type?: 'function' | 'event' | 'error'; limit: number }) {
  let query = `@selector:{${params.selector}}`;
  if (params.type) {
    query += `,@type:{${params.type}}`;
  }
  return _querySelectors({ query, limit: params.limit });
}

export async function searchFunctions(params: { query: string; limit: number }) {
  return _querySelectors({
    query: `@name:'${params.query}' | @name:${params.query}* | @name:*${params.query}*`,
    limit: params.limit,
  });
}
