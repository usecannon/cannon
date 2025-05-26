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

export function getGasUsedPercentage(
  gasUsed: bigint,
  gasLimit: bigint
): string {
  if (gasLimit === BigInt(0)) return '0%';
  const percentage = (Number(gasUsed) / Number(gasLimit)) * 100;
  return `${percentage === 100 ? percentage.toFixed(0) : percentage.toFixed(2)}%`;
}

export function formatUTCDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp));

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  };

  const formatted = date.toLocaleString('en-US', options);

  return formatted.replace(',', '').replace(' ', '-').concat(' UTC');
}