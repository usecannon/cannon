import * as viem from 'viem';
import { RedisPackage, RedisTag } from './db/transformers';
import { BadRequestError, ServerError } from './errors';

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
    return packageName.replace(/-/g, '\\-');
  } catch (err) {
    throw new BadRequestError('Invalid package name');
  }
}

const packageRefRegex = /^[a-z0-9][A-Za-z0-9-]{1,29}[a-z0-9]:[^@]+(?:@[^\s]+)?$/;
export function isPackageRef(packageName: string) {
  return packageRefRegex.test(packageName);
}

const chainIdListRegex = /^[0-9][0-9,]*(?<!,)$/;
export function parseChainIds(chainIds: any): number[] {
  if (!chainIds) return [];

  if (typeof chainIds !== 'string' || !chainIdListRegex.test(chainIds)) {
    throw new BadRequestError('Invalid chainId number');
  }

  return chainIds.split(',').map((chainId) => Number.parseInt(chainId, 10));
}

export function parseTextQuery(query: any): string {
  if (!query) return '';

  if (typeof query !== 'string' || query.length > 256) {
    throw new BadRequestError('Invalid query parameter');
  }

  return (
    query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      // only leave valid characters and remove starting or ending '-'s
      .replace(/^[-]+|[^a-z0-9-]|[-]+$/g, '')
  );
}

export function parseAddresses(addresses: any) {
  if (typeof addresses !== 'string') return [] as viem.Address[];
  const result = addresses.split(',');

  if (result.some((val) => !viem.isAddress(val))) {
    throw new ServerError(`Invalid publishers "${addresses}"`);
  }

  return result as viem.Address[];
}

export function isRedisTagOfPackage(a: RedisPackage, b: RedisTag) {
  return a.name === b.name && a.version === b.versionOfTag && a.preset === b.preset && a.chainId === b.chainId;
}
