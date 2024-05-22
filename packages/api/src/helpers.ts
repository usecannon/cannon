import * as viem from 'viem';
import { BadRequestError, ServerError } from './errors';
import { ApiDocumentType, RedisPackage, RedisTag } from './types';

const packageNameRegex = /^[a-z0-9][A-Za-z0-9-]{1,29}[a-z0-9]$/;
export function isPackageName(packageName: any) {
  return typeof packageName === 'string' && packageNameRegex.test(packageName);
}

export function parsePackageName(packageName: string) {
  if (!isPackageName(packageName)) {
    throw new BadRequestError('Invalid package name');
  }

  return packageName.replace(/-/g, '\\-');
}

const partialPackageRefRegex = /^[a-z0-9][A-Za-z0-9-]{1,29}[a-z0-9]:[^@]+(?:@[^\s]+)?$/;
export function isPartialPackageRef(packageName: any) {
  return typeof packageName === 'string' && partialPackageRefRegex.test(packageName);
}

const fullPackageRefRegex = /^[a-z0-9][A-Za-z0-9-]{1,29}[a-z0-9]:[^@]+@[^\s]+$/;
export function isFullPackageRef(fullPackageRef: any) {
  return typeof fullPackageRef === 'string' && fullPackageRefRegex.test(fullPackageRef);
}

const contractNameRegex = /^[A-Z][A-Za-z0-9_]*$/;
export function isContractName(contractName: any) {
  return typeof contractName === 'string' && contractNameRegex.test(contractName);
}

const functionSelectorRegex = /^0x[0-9a-fA-F]{8}$/;
export function isFunctionSelector(selector: any) {
  return typeof selector === 'string' && functionSelectorRegex.test(selector);
}

const chainIdRegex = /^[0-9]+$/;
export function isChainId(chainId: any) {
  return typeof chainId === 'string' && chainIdRegex.test(chainId);
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

  if (typeof query !== 'string' || query.length > 2048) {
    throw new BadRequestError('Invalid query parameter');
  }

  return (
    query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      // only leave valid characters and remove starting or ending '-'s
      .replace(/^[-_]+|[^a-z0-9-_]|[-_]+$/g, '') || ''
  );
}

export function parseQueryTypes(type: any): ApiDocumentType[] {
  if (!type) return [];

  if (typeof type !== 'string' || type.length > 512) {
    throw new BadRequestError('Invalid type parameter');
  }

  return type
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z,]+|[^a-z]+$/g, '')
    .split(',') as ApiDocumentType[];
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
