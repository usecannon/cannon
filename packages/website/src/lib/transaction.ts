import { formatEther, formatGwei } from 'viem';

export function getTransactionSavings(maxFeePerGas: bigint, effectiveGasPrice: bigint, gasUsed: bigint): string {
  return formatEther(maxFeePerGas * gasUsed - effectiveGasPrice * gasUsed).toLocaleString();
}

export function convertToGwei(value: bigint | string): string {
  if (typeof value === 'string') {
    return `${formatGwei(BigInt(parseInt(value.slice(2), 16))).toLocaleString()} Gwei`;
  } else {
    return `${formatGwei(value).toLocaleString()} Gwei`;
  }
}

export function convertToDec(value: bigint | string): bigint {
  return typeof value === 'string' ? BigInt(parseInt(value.slice(2), 16)) : value;
}

export function convertToFormatEther(value: bigint | string, symbol: string | undefined): string {
  return `${formatEther(convertToDec(value)).toLocaleString()} ${symbol ?? ''}`;
}

export function getGasUsedPercentage(gasUsed: bigint, gasLimit: bigint): string {
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
