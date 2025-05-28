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

export function getTransactionSavings(maxFeePerGas: bigint, effectiveGasPrice: bigint, gasUsed: bigint): string {
  return formatEther(maxFeePerGas * gasUsed - effectiveGasPrice * gasUsed).toLocaleString();
}

export function convertToGwei(value: bigint): string {
  return `${formatUnits(value, 9).toLocaleString()} Gwei`;
}

export function convertToFormatEther(value: bigint, symbol: string | undefined): string {
  return `${formatEther(value).toLocaleString()} ${symbol}`;
}

export function getTimeAgo(date: bigint): string {
  const now = Date.now();
  const past = Number(date) * 1000;
  const diffMs = now - past;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? "s" : ""} ago`;
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
