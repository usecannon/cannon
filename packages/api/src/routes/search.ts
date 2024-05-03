import { PackageReference } from '@usecannon/builder';
import express from 'express';
import { Address, isAddress, isHash } from 'viem';
import { searchByAddress, searchPackages } from '../db/queries';
import { BadRequestError } from '../errors';
import { parseChainIds } from '../helpers';
import { ApiDocument, ApiDocumentType } from '../types';

const search = express.Router();

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
    isAddress: isAddress(query),
    isTx: isHash(query),
    isPackage: PackageReference.isValid(query),
    total: 0,
    data: [] as ApiDocument[],
  };

  if (response.isAddress) {
    const result = await searchByAddress(query as Address);
    Object.assign(response, result);
  } else if (response.isTx) {
    // empty
  } else {
    const result = await searchPackages({
      query,
      chainIds,
      limit: types.length ? 500 : 20,
      includeNamespaces: !types.length || types.includes('namespace'),
    });

    Object.assign(response, result);
  }

  // TODO: contractName or address, responds contract (reg:addressToPackage, reg:abi?)
  // TODO: fullPackageRef respond packages
  // TODO: fnNames or Selectors (reg: abi), responds with 'function'
  // TODO: tx (look for package names) reg:transactionToPackage

  res.json(response);
});

export { search };
