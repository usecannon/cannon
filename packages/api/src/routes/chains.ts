import express from 'express';

const chains = express.Router();

chains.get('/chains', async (req, res) => {
  res.json({
    status: 200,
    results: [13370, 11155111],
  });
});

export { chains };
