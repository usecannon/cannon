import * as viem from 'viem';
import { ApiError, BadRequestError } from './errors';

// TODO: replace this function by one exported by @usecannon/builder
function _validatePackageName(n: string) {
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

export function parsePackageName(packageName: string) {
  try {
    _validatePackageName(packageName);
    return packageName;
  } catch (err) {
    throw new BadRequestError('Invalid package name');
  }
}

export function parsePage(page: any) {
  const parsed = Number.parseInt(page || '1', 10);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestError('Invalid page number');
  }

  return parsed;
}

export function parseAddresses(addresses: any) {
  if (typeof addresses !== 'string') return [] as viem.Address[];
  const result = addresses.split(',');

  if (result.some((val) => !viem.isAddress(val))) {
    throw new ApiError(`Invalid publishers "${addresses}"`);
  }

  return result as viem.Address[];
}