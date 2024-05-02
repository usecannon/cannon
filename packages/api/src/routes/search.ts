import { PackageReference } from '@usecannon/builder';
import express from 'express';
import { isAddress, isHash } from 'viem';
import { BadRequestError } from '../errors';
import { parseChainIds } from '../helpers';
import { searchPackages } from '../queries';

const search = express.Router();

search.get('/search', async (req, res) => {
  const chainIds = parseChainIds(req.query.chainIds);

  if (req.query.query && typeof req.query.query !== 'string') {
    throw new BadRequestError('Invalid "query" param');
  }

  const response = {
    status: 200,
    query: req.query.query,
    isAddress: false,
    isTx: false,
    isPackage: false,
  };

  if (req.query.query) {
    if (isAddress(req.query.query)) {
      response.isAddress = true;
    } else if (isHash(req.query.query)) {
      response.isTx = true;
    } else if (PackageReference.isValid(req.query.query)) {
      response.isPackage = true;
    }
  }

  const results = await searchPackages({
    query: req.query.query,
    page: req.query.page,
    chainIds,
  });

  Object.assign(response, results);

  // TODO: search both reg:package and reg:abi for query texts, and abi function selector

  res.json(response);
});

export { search };
