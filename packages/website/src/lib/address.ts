import { initialSelectorDecodeUrl } from '@/helpers/store';
import { TransactionRow, TransactionCsvRow, TokenTransferRow } from '@/types/AddressList';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Chain } from '@/types/Chain';
import { convertToFormatEther } from '@/lib/transaction';

export async function getMethods(txs: any[]) {
  const inputs = txs.filter((tx: any) => tx.input !== '0x').map((tx: any) => tx.input.slice(0, 10));
  const url = initialSelectorDecodeUrl + inputs.join(',');
  const response = await fetch(url);
  const names = await response.json();
  return names.results;
}

export function matchFunctionName(names: any, input: string) {
  if (input === '0x') return 'Transfer';

  const selector = input.slice(0, 10);
  const functionNames = names[selector];
  if (functionNames && functionNames.length > 0) {
    const methodname = functionNames[0].name ?? selector;
    const match = methodname.match(/([A-Za-z0-9]*)\(/);
    return match ? match[1] : methodname;
  }
  return selector;
}

export function mapToTransactionLlist(txs: any[], receipts: any[], names: any) {
  return Object.entries(txs).map(([, tx]): TransactionRow => {
    const receipt = receipts.find((r) => r.transactionHash === tx.hash);
    const method = matchFunctionName(names, tx.input);
    const txnFee =
      receipt?.gasUsed && tx.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '';

    return {
      detail: '',
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to ? tx.to : '',
      amount: tx.value,
      age: receipt?.timestamp,
      method: method,
      txnFee: txnFee,
      gasPrice: tx.gasPrice,
      contractAddress: receipt?.contractAddress,
    };
  });
}

export function mapToTransactionCsvLlist(txs: any[], receipts: any[], names: any, chain: Chain) {
  return Object.entries(receipts).map(([, receipt]): TransactionCsvRow => {
    const tx = txs.find((tx) => receipt.transactionHash === tx.hash);
    const method = matchFunctionName(names, tx.input);
    const dateTime = formatDateTime(receipt?.timestamp);
    const status = receipt?.status.slice(2) === '1' ? 'Sucess' : 'Fail';
    const txnFee =
      receipt?.gasUsed && tx.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '';
    const blockNumber = String(parseInt(tx.blockNumber.slice(2), 16));
    const amount = String(convertToFormatEther(tx.value, chain?.nativeCurrency.symbol) ?? '0 ETH');

    return {
      hash: tx.hash,
      status: status,
      method: method,
      blockNumber: blockNumber,
      dateTime: dateTime,
      from: tx.from,
      to: tx.to ? tx.to : '',
      amount: amount,
      txnFee: txnFee,
    };
  });
}

export function formatDateTime(timestamp: bigint) {
  return format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd H:mm:ss');
}

export function mapToTokenTransferList(txs: any[], receipts: any[], names: any) {
  return Object.entries(receipts).map(([, receipt]): TokenTransferRow => {
    const tx = txs.find((t) => receipt.transactionHash === t.hash);
    const method = matchFunctionName(names, tx.input ?? '');

    return {
      detail: '',
      hash: tx.hash,
      method: method,
      blockNumber: tx.blockNumber,
      age: receipt?.timestamp,
      from: tx.from,
      to: tx.to ? tx.to : '',
      amount: tx.value,
      contractAddress: receipt?.contractAddress,
    };
  });
}

export function handleDownload(txs: any[], receipts: any[], names: any, chain: Chain, fileName: string) {
  const csvHeader = ['Transaction Hash', 'Status', 'Method', 'Blockno', 'Date Time', 'From', 'To', 'Amount', 'Txn Fee'];

  const rows = mapToTransactionCsvLlist(txs, receipts, names, chain);

  const csvContent = [csvHeader, ...rows.map((row) => Object.values(row))].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
