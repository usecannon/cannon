import { ApiPackage, IpfsUrl, RedisDocument, RedisPackage, RedisTag } from '../types';

import type { Address } from 'viem';

export function findPackageByTag(documents: { value: RedisDocument }[], tag: RedisTag) {
  const result = documents.find(
    (item) =>
      item.value.type === 'package' &&
      item.value.name === tag.name &&
      item.value.preset === tag.preset &&
      item.value.chainId === tag.chainId &&
      item.value.version === tag.versionOfTag
  );

  if (!result) return undefined;

  return result.value as RedisPackage;
}

export function transformPackage(value: RedisPackage): ApiPackage {
  return {
    type: 'package',
    name: value.name as string,
    version: value.version as string,
    preset: value.preset as string,
    chainId: Number.parseInt(value.chainId as string),
    deployUrl: value.deployUrl as IpfsUrl,
    metaUrl: value.metaUrl as IpfsUrl,
    miscUrl: value.miscUrl as IpfsUrl,
    timestamp: Number.parseInt(value.timestamp as string),
    publisher: value.owner as Address,
  };
}

export function transformPackageWithTag(pkg: RedisPackage, tag: RedisTag): ApiPackage {
  return {
    type: 'package',
    name: tag.name as string,
    version: tag.tag as string,
    preset: tag.preset as string,
    chainId: Number.parseInt(tag.chainId as string),
    deployUrl: pkg.deployUrl as IpfsUrl,
    metaUrl: pkg.metaUrl as IpfsUrl,
    miscUrl: pkg.miscUrl as IpfsUrl,
    timestamp: Number.parseInt(tag.timestamp as string),
    publisher: pkg.owner as Address,
  };
}
