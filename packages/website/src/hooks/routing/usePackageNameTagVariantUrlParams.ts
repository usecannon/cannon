import { PackageReference } from '@usecannon/builder';
import { useRouter } from 'next/router';
import { useMemo } from 'react';

export function usePackageNameTagVariantUrlParams() {
  const { query: params } = useRouter();
  const { name, tag, variant } = params;

  if (typeof name !== 'string' || typeof tag !== 'string' || typeof variant !== 'string')
    throw new Error('Missing required params');

  const memoizedParams = useMemo(() => {
    const _variant = decodeURIComponent(variant);
    const [chainId, preset] = PackageReference.parseVariant(decodeURIComponent(_variant));

    return {
      name: decodeURIComponent(name),
      tag: decodeURIComponent(tag),
      variant: _variant,
      preset,
      chainId,
    };
  }, [name, tag, variant]);

  return memoizedParams;
}
