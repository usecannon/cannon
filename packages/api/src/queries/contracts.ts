import { PackageReference } from '@usecannon/builder';
import { AggregateGroupByReducers, AggregateSteps } from 'redis';
import * as viem from 'viem';
import * as keys from '../db/keys';
import { isChainId, isContractName } from '../helpers';
import { useRedis } from '../redis';
import { ApiContract } from '../types';

type ContractQueryResult = { contractName: string; package: string; chainId: string; address: string };

function _parseAggregateResult(doc: ContractQueryResult) {
  if (!doc) return;
  if (!isContractName(doc.contractName)) return;
  if (!PackageReference.isValid(doc.package)) return;
  if (!isChainId(doc.chainId)) return;
  if (!viem.isAddress(doc.address)) return;
  return doc;
}

async function _aggregateContracts(query: string): Promise<ContractQueryResult[]> {
  const redis = await useRedis();

  const data: ContractQueryResult[] = [];

  const res = (await redis.ft.aggregate(keys.RKEY_ABI_SEARCHABLE, query, {
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
    results: ContractQueryResult[];
  };

  for (const doc of res.results) {
    const parsed = _parseAggregateResult(doc);

    if (!parsed) {
      // eslint-disable-next-line no-console
      console.warn(
        new Error(
          `Could not parse "${doc && JSON.stringify(doc)}" on query "FT.AGGREGATE ${keys.RKEY_ABI_SEARCHABLE} ${query}"`
        )
      );
      continue;
    }

    data.push(parsed);
  }

  return data;
}

async function _queryContracts(params: { query: string; limit?: number }) {
  const results = await _aggregateContracts(params.query);

  const data = results.map((doc) => {
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
