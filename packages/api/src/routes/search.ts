import { PackageReference } from '@usecannon/builder';
import express from 'express';
import { isAddress, isHash } from 'viem';
import { BadRequestError } from '../errors';
import { searchPackages } from '../queries';

const search = express.Router();

search.get('/search', async (req, res) => {
  if (typeof req.query.query !== 'string') {
    throw new BadRequestError('Missing or invalid "query" param');
  }

  const query = req.query.query;

  const response = {
    status: 200,
    query,
    isAddress: false,
    isTx: false,
    isPackage: false,
  };

  if (isAddress(query)) {
    response.isAddress = true;
  } else if (isHash(query)) {
    response.isTx = true;
  } else if (PackageReference.isValid(query)) {
    response.isPackage = true;
  }

  const results = await searchPackages({
    query,
    page: req.query.page,
  });

  Object.assign(response, results);

  // TODO: search both reg:package and reg:abi for query texts, and abi function selector

  res.json(response);
});

export { search };
