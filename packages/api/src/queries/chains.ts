import TTLCache from '@isaacs/ttlcache';
import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as keys from '../db/keys';
import { useRedis } from '../redis';

interface ChainsResponse {
  total: number;
  data: number[];
}

const cache = new TTLCache<string, Promise<ChainsResponse>>({ max: 10, ttl: 60 * 1000 });

async function _queryChains(withTotal: boolean) {
  const redis = await useRedis();

  const results = (await redis.ft.aggregate(keys.RKEY_PACKAGE_SEARCHABLE, '*', {
    STEPS: [
      {
        type: AggregateSteps.GROUPBY,
        properties: '@chainId',
        REDUCE: withTotal
          ? {
              type: AggregateGroupByReducers.COUNT,
            }
          : {
              type: AggregateGroupByReducers.COUNT_DISTINCT,
              property: '@chainId',
            },
      },
    ],
  })) as any;

  return {
    total: results.total as number,
    data: results.results.map((r: any) => r.chainId).filter(Boolean) as number[],
  };
}

export async function getChainIds(): Promise<number[]> {
  if (!cache.has('getChainIds')) {
    const q = _queryChains(false);
    cache.set('getChainIds', q);
  }

  const results = await cache.get('getChainIds')!;
  return results.data;
}

export async function getChainIdsWithCount() {
  if (!cache.has('getChainIdsWithCount')) {
    const q = _queryChains(true);
    cache.set('getChainIdsWithCount', q);
  }

  return await _queryChains(true);
}
