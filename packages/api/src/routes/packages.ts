import express, { Request, Response } from 'express';
import { findPackagesByName } from '../db/queries';

const packages = express.Router();

packages.get('/packages/:packageName', async (req: Request, res: Response) => {
  const result = await findPackagesByName({
    packageName: req.params.packageName,
  });

  res.json({
    status: 200,
    ...result,
  });
});

export { packages };
