import isInteger from 'lodash/isInteger';
import { useRouter } from 'next/router';
import { Address, isAddress } from 'viem';

export function useSafeUrl() {
  const router = useRouter();
  const { query: params } = router;
  const { chainId, safeAddress } = params;

  const isSafeUrl = router.pathname.includes('/deploy/[chainId]/[safeAddress]');

  if (isSafeUrl && !isInteger(Number(chainId))) throw new Error('Invalid chainId URL param');

  if (isSafeUrl && (typeof safeAddress !== 'string' || !isAddress(safeAddress))) {
    throw new Error('Invalid safeAddress URL param');
  }

  return {
    isSafeUrl,
    chainId: chainId ? +chainId : null,
    safeAddress: (safeAddress as Address) || null,
    safeString: `${chainId}:${safeAddress}`,
  };
}
