import * as viem from 'viem';
import { Request, Response, Router } from 'express';
import { BadRequestError } from '../errors';
import { findSelector } from '../queries/selectors';
import { ApiSelectorResult } from '../types';

const selector: Router = Router();

selector.get('/selector', async (req: Request, res: Response) => {
  if (typeof req.query.q !== 'string') {
    throw new BadRequestError('Query selector not specified');
  }
  const selectors = req.query.q.split(',') as viem.Hex[];
  const type = req.query.type as 'function' | 'event' | 'error';

  const results: Record<string, ApiSelectorResult[]> = {};

  for (const selector of selectors) {
    results[selector] = (
      await findSelector({
        selector,
        type,
        limit: 10,
      })
    ).data;
  }

  res.json({
    status: 200,
    results,
  });
});

export { selector };
