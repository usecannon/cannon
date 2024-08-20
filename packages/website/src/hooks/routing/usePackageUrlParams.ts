import { useRouter } from 'next/router';

export function usePackageUrlParams() {
  const { query: params } = useRouter();
  const { name } = params;

  if (typeof name !== 'string') throw new Error('Missing name param');

  return {
    name: decodeURIComponent(name),
  };
}
