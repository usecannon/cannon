import { useRouter } from 'next/router';
import { useMemo } from 'react';

export function usePackageUrlParams() {
  const { query: params } = useRouter();
  const { name } = params;

  if (typeof name !== 'string') throw new Error('Missing name param');

  return useMemo(
    () => ({
      name: decodeURIComponent(name),
    }),
    [name]
  );
}
