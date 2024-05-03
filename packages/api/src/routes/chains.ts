import express from 'express';
import { getChaindIds } from '../db/queries';

const chains = express.Router();

chains.get('/chains', async (req, res) => {
  const results = await getChaindIds();

  res.json({
    status: 200,
    ...results,
  });
});

export { chains };
