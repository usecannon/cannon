import express from 'express';
import { useRedis } from '../redis';
import { ApiPackage } from '../types';
import { packageNameValidator } from '../validators';

const routes = express.Router();

packageNameValidator(routes);

routes.get('/packages/:packageName', async (req, res) => {
  const redis = await useRedis();
  const { packageName } = req.params;

  const packages = await redis.ft.search('reg:search', `@name:${packageName}`);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(packages, null, 2));

  res.json({
    status: 200,
    content: {
      name: packageName,
      owner: '0xca7777aB932E8F0b930dE9F0d96f4E9a2a00DdD3',
      publishers: ['0x3852C9fdc6a5C0A4A6230c1d2d954ccCB9b90465'],
      last_updated: Date.now(),
      tags: {
        total_count: 2,
        per_page: 10,
        current_page: 1,
        results: [
          {
            version: 'latest',
            preset: 'main',
            chainId: 11155111,
            deployUrl: 'ipfs://QmTZMDY72h31HGJnHVVtDP81RUdXX3g8sPqTfu8aW34WRP',
            metaUrl: 'ipfs://QmNg2R3moWLsMLAVKYYzzoHUHjjmXBDnYqphvSCBSBXWsm',
          },
          {
            version: '0.0.1',
            preset: 'main',
            chainId: 11155111,
            deployUrl: 'ipfs://QmTZMDY72h31HGJnHVVtDP81RUdXX3g8sPqTfu8aW34WRP',
            metaUrl: 'ipfs://QmNg2R3moWLsMLAVKYYzzoHUHjjmXBDnYqphvSCBSBXWsm',
          },
          {
            version: 'latest',
            preset: 'main',
            chainId: 13370,
            deployUrl: 'ipfs://QmTZMDY72h31HGJnHVVtDP81RUdXX3g8sPqTfu8aW34WRP',
            metaUrl: 'ipfs://QmNg2R3moWLsMLAVKYYzzoHUHjjmXBDnYqphvSCBSBXWsm',
          },
          {
            version: '0.0.1',
            preset: 'main',
            chainId: 13370,
            deployUrl: 'ipfs://QmTZMDY72h31HGJnHVVtDP81RUdXX3g8sPqTfu8aW34WRP',
            metaUrl: 'ipfs://QmNg2R3moWLsMLAVKYYzzoHUHjjmXBDnYqphvSCBSBXWsm',
          },
        ],
      },
    } satisfies ApiPackage,
  });
});

routes.get('/chains', async (req, res) => {
  res.json({
    status: 200,
    results: [13370, 11155111],
  });
});

routes.get('/search', async (req, res) => {
  // TX?
  // Address?
  // PackageName?

  res.json({
    status: 200,
    results: [],
  });
});

export { routes };
