import express, { Request, Response } from 'express';
import { findPackageByName } from '../queries';

const routes = express.Router();

routes.get('/packages/:packageName', async (req: Request, res: Response) => {
  const result = await findPackageByName({
    packageName: req.params.packageName,
    page: req.query.page,
  });

  res.json({
    status: 200,
    result,
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
