import { formatUnits } from 'viem';

export const formatToken = (amount: bigint, options?: { decimals?: number; symbol?: string }) => {
  return `${formatUnits(amount, options?.decimals || 18)} ${options?.symbol}`.trim();
};
