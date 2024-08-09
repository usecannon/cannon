import { PackageReference } from '@usecannon/builder';
import { useRouter } from 'next/router';

export function usePackageUrlParams() {
  const { query: params } = useRouter();
  const { name, tag } = params;
  if (typeof name !== 'string' || typeof tag !== 'string' || typeof params.variant !== 'string')
    throw new Error('Missing required params');

  const variant = decodeURIComponent(params.variant);
  const [chainId, preset] = PackageReference.parseVariant(decodeURIComponent(variant));

  return {
    name: decodeURIComponent(name),
    tag: decodeURIComponent(tag),
    variant,
    preset,
    chainId,
  };
}
