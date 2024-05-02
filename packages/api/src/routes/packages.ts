import express, { Request, Response } from 'express';
import { findPackagesByName } from '../queries';

const packages = express.Router();

packages.get('/packages/:packageName', async (req: Request, res: Response) => {
  const result = await findPackagesByName({
    packageName: req.params.packageName,
    page: req.query.page,
  });

  res.json({
    status: 200,
    ...result,
  });
});

export { packages };
