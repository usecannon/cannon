import express from 'express';
import * as viem from 'viem';
import { BadRequestError } from '../errors';
import { isContractName, isFunctionSelector, isPartialPackageRef, parseChainIds } from '../helpers';
import { findContractsByAddress, searchContracts } from '../queries/contracts';
import { findFunctionsBySelector, searchFunctions } from '../queries/functions';
import { findPackagesByPartialRef, searchPackages } from '../queries/packages';
import { ApiDocument, ApiDocumentType } from '../types';

const search = express.Router();

export interface SearchResponse {
  status: number;
  query: string;
  isAddress: boolean;
  isTx: boolean;
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

  const { query = '' } = req.query;
  const types = (typeof req.query.types === 'string' ? req.query.types.split(',') : []) as ApiDocumentType[];

  const response = {
    status: 200,
    query,
    isAddress: viem.isAddress(query),
    isTx: viem.isHash(query),
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
    // empty
  } else if (response.isPackageRef) {
    const result = await findPackagesByPartialRef({
      packageRef: query,
    });

    _pushResults(response, result);
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

  // TODO: fnNames or Selectors (reg: abi), responds with 'function'
  // TODO: tx (look for package names) reg:transactionToPackage

  res.json(response);
});

export { search };
