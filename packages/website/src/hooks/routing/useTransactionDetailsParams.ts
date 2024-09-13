import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { Address, isAddress, isHash } from 'viem';

export function useTransactionDetailsParams() {
  const { query: params } = useRouter();
  const { safeAddress, chainId, nonce, sigHash } = params;

  if (
    typeof safeAddress !== 'string' ||
    typeof chainId !== 'string' ||
    typeof nonce !== 'string' ||
    typeof sigHash !== 'string'
  ) {
    throw new Error('Missing or malformed required params');
  }

  if (!isAddress(safeAddress)) {
    throw new Error('Invalid Safe Address');
  }

  if (isNaN(Number(chainId))) {
    throw new Error('Invalid Chain ID');
  }

  if (isNaN(Number(nonce))) {
    throw new Error('Invalid nonce');
  }

  if (!isHash(sigHash)) {
    throw new Error('Invalid signHash');
  }

  return useMemo(
    () => ({
      safeAddress: safeAddress as Address,
      chainId: parseInt(chainId),
      nonce: parseInt(nonce),
      sigHash,
    }),
    [safeAddress, chainId, nonce, sigHash]
  );
}
