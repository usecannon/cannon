import { PackageReference } from '@usecannon/builder';
import * as viem from 'viem';
import { isChainId, isContractName, isFunctionSelector } from '../helpers';
import { ApiFunction, ApiPackage, IpfsUrl, RedisDocument, RedisFunction, RedisPackage, RedisTag } from '../types';

export function findPackageByTag(documents: { value: RedisDocument }[], tag: RedisTag) {
  const result = documents.find(
    (item) =>
      item.value.type === 'package' &&
      item.value.name === tag.name &&
      item.value.preset === tag.preset &&
      item.value.chainId === tag.chainId &&
      item.value.version === tag.versionOfTag
  );

  if (!result) return;

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
    publisher: value.owner as viem.Address,
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
    publisher: pkg.owner as viem.Address,
  };
}

export function transformFunction(value: RedisFunction) {
  if (!value) return;
  if (typeof value.name !== 'string' || !value.name) return;
  if (!isFunctionSelector(value.selector)) return;
  if (typeof value.timestamp !== 'string' || !value.timestamp) return;
  if (!PackageReference.isValid(value.package)) return;
  if (!isChainId(value.chainId)) return;
  if (!viem.isAddress(value.address)) return;
  if (!isContractName(value.contractName)) return;

  const ref = new PackageReference(value.package);
  return {
    type: 'function',
    name: value.name,
    selector: value.selector,
    contractName: value.contractName,
    chainId: Number.parseInt(value.chainId),
    address: viem.getAddress(value.address),
    packageName: ref.name,
    preset: ref.preset,
    version: ref.version,
  } satisfies ApiFunction;
}
