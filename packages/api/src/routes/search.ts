import { PackageReference } from '@usecannon/builder';
import express from 'express';
import { isAddress, isHash } from 'viem';
import { BadRequestError } from '../errors';
import { useRedis } from '../redis';

const search = express.Router();

search.get('/search', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const redis = await useRedis();

  const { query } = req.query;

  if (typeof query !== 'string') {
    throw new BadRequestError(`Invalid "query" parameter ${query}`);
  }

  const response = {
    status: 200,
    query,
    isAddress: false,
    isTx: false,
    isPackage: false,
    results: [],
  };

  if (isAddress(query)) {
    response.isAddress = true;
  } else if (isHash(query)) {
    response.isTx = true;
  } else if (PackageReference.isValid(query)) {
    response.isPackage = true;
  }

  // TODO: search both reg:package and reg:abi for query texts, and abi function selector

  res.json(response);
});

export { search };
