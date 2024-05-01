import { Router } from 'express';
import { BadRequestError } from './errors';

export function validatePackageName(n: string) {
  if (n.length < 3) {
    throw new Error('package name must be at least 3 characters long');
  }

  if (n.length > 31) {
    throw new Error('package name must be at most 31 characters long');
  }

  if (n[n.length - 1] === '-' || n[0] === '-') {
    throw new Error('first and last character of package name must not be dash (-)');
  }

  if (!/^[0-9a-z-]*$/.test(n)) {
    throw new Error('cannon packages can only have names connecting lowercase, alphanumeric characters, and dashes');
  }
}

export function packageNameValidator(app: Router) {
  app.param('packageName', (req, res, next) => {
    try {
      validatePackageName(req.params.packageName);
    } catch (err) {
      throw new BadRequestError('Invalid package name');
    }

    next();
  });
}
