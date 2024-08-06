import { getPackage } from '@/helpers/api';
import { useQuery } from '@tanstack/react-query';

export function usePackage({ name, tag, preset, chainId }: { name: string; tag: string; preset: string; chainId: number }) {
  return useQuery({
    queryKey: ['package', `${name}:${tag}@${preset}/${chainId}`],
    queryFn: getPackage,
    enabled: !!name && !!tag && !!preset && !!chainId,
  });
}
