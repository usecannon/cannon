import express from 'express';
import Fuse from 'fuse.js';
import * as viem from 'viem';
import { BadRequestError } from '../errors';
import {
  isContractName,
  isFunctionSelector,
  isPartialPackageRef,
  parseChainIds,
  parseQueryTypes,
  parseTextQuery,
} from '../helpers';
import { findContractsByAddress, searchContracts } from '../queries/contracts';
import { findFunctionsBySelector, searchFunctions } from '../queries/functions';
import { findPackagesByPartialRef, searchPackages } from '../queries/packages';
import { ApiDocument } from '../types';

const search = express.Router();

export interface SearchResponse {
  status: number;
  query: string;
  isAddress: boolean;
  isTx: boolean;
  isHex: boolean;
  isPackageRef: boolean;
  isContractName: boolean;
  isFunctionSelector: boolean;
  total: number;
  data: ApiDocument[];
}

function _pushResults(response: SearchResponse, result: { total: number; data: ApiDocument[] }) {
  response.total += result.total;
  response.data.push(...result.data);
}

search.get('/search', async (req, res) => {
  const chainIds = parseChainIds(req.query.chainIds);

  if (req.query.query && typeof req.query.query !== 'string') {
    throw new BadRequestError('Invalid "query" param');
  }

  const query = parseTextQuery(req.query.query);
  const types = parseQueryTypes(req.query.types);

  const response = {
    status: 200,
    query,
    isAddress: viem.isAddress(query),
    isTx: viem.isHash(query),
    isHex: !viem.isHash(query) && viem.isHex(query),
    isPackageRef: isPartialPackageRef(query),
    isContractName: isContractName(query),
    isFunctionSelector: isFunctionSelector(query),
    total: 0,
    data: [] as ApiDocument[],
  } satisfies SearchResponse;

  if (response.isAddress) {
    const result = await findContractsByAddress({
      address: query as viem.Address,
      limit: 20,
    });

    _pushResults(response, result);
  } else if (response.isTx) {
    // TODO: tx (look for package names) reg:transactionToPackage
  } else if (response.isPackageRef) {
    const result = await findPackagesByPartialRef({
      packageRef: query,
    });

    _pushResults(response, result);
  } else if (response.isHex) {
    if (query.length >= 10) {
      const selector = query.slice(0, 10);
      const result = await findFunctionsBySelector({
        selector: selector as viem.Hex,
        limit: 20,
      });

      _pushResults(response, result);
    }
  } else if (response.isFunctionSelector) {
    const result = await findFunctionsBySelector({
      selector: query as viem.Hex,
      limit: 20,
    });

    _pushResults(response, result);
  } else {
    // Search by contractName
    if ((!types.length || types.includes('contract')) && response.isContractName && query.length >= 5) {
      const contractsResults = await searchContracts({
        query,
        limit: 20,
      });

      _pushResults(response, contractsResults);
    }

    // Search by functionName
    if ((!types.length || types.includes('function')) && query.length >= 5) {
      const contractsResults = await searchFunctions({
        query,
        limit: 20,
      });

      _pushResults(response, contractsResults);
    }

    const packagesResult = await searchPackages({
      query,
      chainIds,
      limit: types.length ? 500 : 20,
      includeNamespaces: !types.length || types.includes('namespace'),
    });

    _pushResults(response, packagesResult);
  }

  if (query) {
    const fuzzyOrder = new Fuse<ApiDocument>(response.data, {
      keys: [
        'type',
        {
          name: 'name',
          weight: 2,
        },
        {
          name: 'contractName',
          weight: 2,
        },
        {
          name: 'selector',
          weight: 3,
        },
        {
          name: 'address',
          weight: 3,
        },
      ],
    });

    response.data = fuzzyOrder.search(query).map(({ item }) => item);
  }

  res.json(response);
});

export { search };
