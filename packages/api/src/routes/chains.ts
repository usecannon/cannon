import { Router } from 'express';
import { getChainIdsWithCount } from '../queries/chains';

const chains: Router = Router();

chains.get('/chains', async (req, res) => {
  const results = await getChainIdsWithCount();

  res.json({
    status: 200,
    ...results,
  });
});

export { chains };
