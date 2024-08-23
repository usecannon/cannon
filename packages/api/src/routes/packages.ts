import { Request, Response, Router } from 'express';
import { BadRequestError, NotFoundError } from '../errors';
import { isChainId, isFullPackageRef, isPackageName } from '../helpers';
import { findPackageByFullRef, findPackagesByName } from '../queries/packages';

const packages: Router = Router();

packages.get('/packages/:packageName', async (req: Request, res: Response) => {
  if (!isPackageName(req.params.packageName)) {
    throw new BadRequestError(`Invalid package name "${req.params.packageName}"`);
  }

  const result = await findPackagesByName({
    packageName: req.params.packageName,
  });

  res.json({
    status: 200,
    ...result,
  });
});

packages.get('/packages/:fullPackageRef/:chainId', async (req: Request, res: Response) => {
  const { fullPackageRef, chainId } = req.params;

  if (!isFullPackageRef(fullPackageRef)) {
    throw new BadRequestError(`Invalid package ref "${fullPackageRef}"`);
  }

  if (!isChainId(chainId)) {
    throw new BadRequestError(`Invalid chainId "${chainId}"`);
  }

  const data = await findPackageByFullRef({
    fullPackageRef,
    chainId,
  });

  if (!data) {
    throw new NotFoundError(`Package with name "${fullPackageRef}" at "${chainId}" not found`);
  }

  res.json({
    status: 200,
    data,
  });
});

export { packages };
