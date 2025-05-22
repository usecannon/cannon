import { formatEther, formatUnits } from 'viem';

export function getTxnTypeLabel(typeHex: string): string {
  switch (typeHex) {
    case '0x0':
      return 'Legacy';
    case '0x1':
      return 'EIP-2930';
    case '0x2':
      return 'EIP-1559';
    default:
      return 'Unknown';
  }
}

export function getTransactionSavings(
  maxFeePerGas: bigint,
  effectiveGasPrice: bigint,
  gasUsed: bigint
): string {
  return formatEther(
    maxFeePerGas * gasUsed - effectiveGasPrice * gasUsed
  ).toLocaleString();
}

export function convertToGwei(value: bigint): string {
  return `${formatUnits(value, 9).toLocaleString()} Gwei`;
}

export function convertToFormatEther(
  value: bigint,
  symbol: string | undefined
): string {
  return `${formatEther(value).toLocaleString()} ${symbol}`;
}

export function getDifferentDays(date: bigint): string {
    return `${Math.floor(
                    (Math.floor(Date.now() / 1000) - Number(date)) /
                    (60 * 60 * 24)
                )} days ago`

}
