import express from 'express';
import { useRedis } from '../redis';

const chains = express.Router();

chains.get('/chains', async (req, res) => {
  const redis = await useRedis();

  if (redis) {
    res.json({
      status: 200,
      results: [13370, 11155111],
    });
  }
});

export { chains };
