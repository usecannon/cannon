import { PackageReference } from '@usecannon/builder';
import { useRouter } from 'next/router';
import { Address, isAddress } from 'viem';

export function usePackageVersionUrlParams() {
  const { query: params } = useRouter();
  const { name, tag, variant, moduleName, contractName, contractAddress } = params;

  if (typeof name !== 'string' || typeof tag !== 'string' || typeof variant !== 'string')
    throw new Error('Missing required  params');

  if (moduleName && typeof moduleName !== 'string') {
    throw new Error('Invalid moduleName param');
  }

  if (contractName && typeof contractName !== 'string') {
    throw new Error('Invalid contractName param');
  }

  if (contractAddress && (typeof contractAddress !== 'string' || !isAddress(contractAddress))) {
    throw new Error('Invalid contractAddress param');
  }

  const _variant = decodeURIComponent(variant);
  const [chainId, preset] = PackageReference.parseVariant(decodeURIComponent(_variant));

  return {
    name: decodeURIComponent(name),
    tag: decodeURIComponent(tag),
    variant: _variant,
    preset,
    chainId,
    contractName,
    moduleName,
    contractAddress: (contractAddress as Address) || undefined,
  };
}
