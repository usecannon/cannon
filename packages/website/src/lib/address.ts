import { initialSelectorDecodeUrl } from '@/helpers/store';
import { TransactionRow, TransactionCsvRow, TokenTransferRow, NftTransferRow } from '@/types/AddressList';
import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Chain } from '@/types/Chain';
import { convertToFormatEther } from '@/lib/transaction';
import {
  OtterscanTransaction,
  OtterscanReceipt,
  NftTokenType,
  TokenTransferType,
  NftTransferCsvRow,
  TokenTransferCsvRow,
} from '@/types/AddressList';

export async function getMethods(txs: any[]) {
  const inputs = txs.filter((tx: any) => tx.input !== '0x').map((tx: any) => tx.input.slice(0, 10));
  const url = initialSelectorDecodeUrl + inputs.join(',');
  const response = await fetch(url);
  const names = await response.json();
  return names.results;
}

export function matchFunctionName(methods: any, input: string) {
  if (input === '0x') return 'Transfer';

  const selector = input.slice(0, 10);
  const functionMethods = methods?.[selector];
  if (functionMethods && functionMethods.length > 0) {
    const methodName = functionMethods[0].name ?? selector;
    const match = methodName.match(/([A-Za-z0-9]*)\(/);
    return match ? match[1] : methodName;
  }
  return selector;
}

export function mapToTransactionList(txs: OtterscanTransaction[], receipts: OtterscanReceipt[]) {
  return Object.entries(txs).map(([, tx]): TransactionRow => {
    const receipt = receipts.find((r) => r.transactionHash === tx.hash);
    const txnFee =
      receipt?.gasUsed && tx.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '';

    return {
      detail: '',
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to ?? '',
      amount: tx.value,
      age: receipt?.timestamp,
      method: tx.method ?? '',
      txnFee: txnFee,
      gasPrice: tx.gasPrice,
      contractAddress: receipt?.contractAddress,
    };
  });
}

export function mapToTokenTransferList(txs: OtterscanTransaction[], tokenTransfers: TokenTransferType[]) {
  return Object.entries(tokenTransfers).map(([, transfer]): TokenTransferRow => {
    const tx = txs.find((t) => transfer.hash === t.hash);

    return {
      detail: '',
      hash: transfer.hash,
      method: tx?.method ?? '',
      blockNumber: transfer.blockNumber ?? '',
      age: transfer?.timestamp,
      from: transfer.from,
      to: transfer.to ? transfer.to : '',
      amount: transfer.amount,
      contractAddress: transfer?.contractAddress,
    };
  });
}

export function mapToNftTransferList(txs: OtterscanTransaction[], nftTransfers: NftTokenType[]) {
  return Object.entries(nftTransfers).map(([, transfer]): NftTransferRow => {
    const tx = txs.find((t) => transfer.hash === t.hash);

    return {
      detail: '',
      hash: transfer.hash,
      method: tx?.method ?? '',
      blockNumber: transfer.blockNumber,
      age: transfer?.timestamp,
      from: transfer.from,
      to: transfer.to ?? '',
      type: transfer.type,
      contractAddress: transfer?.contractAddress,
    };
  });
}

export function mapToTransactionCsvRows(txs: any[], receipts: any[], chain: Chain) {
  return Object.entries(receipts).map(([, receipt]): TransactionCsvRow => {
    const tx = txs.find((tx) => receipt.transactionHash === tx.hash);
    const dateTime = formatDateTime(receipt?.timestamp);
    const status = receipt?.status.slice(2) === '1' ? 'Sucess' : 'Fail';
    const txnFee =
      receipt?.gasUsed && tx.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '';
    const blockNumber = String(parseInt(tx.blockNumber.slice(2), 16));
    const amount = String(convertToFormatEther(tx.value, chain?.nativeCurrency.symbol) ?? '0 ETH');

    return {
      hash: tx.hash,
      status: status,
      method: tx.method,
      blockNumber: blockNumber,
      dateTime: dateTime,
      from: tx.from,
      to: tx.to ? tx.to : '',
      amount: amount,
      txnFee: txnFee,
    };
  });
}

export function mapToTokenTransferCsvRows(
  txs: OtterscanTransaction[],
  receipts: OtterscanReceipt[],
  tokenTransfers: TokenTransferType[],
  chain: Chain
): TokenTransferCsvRow[] {
  return Object.entries(tokenTransfers).map(([, transfer]): TokenTransferCsvRow => {
    const dateTime = formatDateTime(BigInt(transfer?.timestamp));
    const tx = txs.find((tx) => transfer.hash === tx.hash);
    const receipt = receipts.find((r) => r.transactionHash === transfer.hash);
    const status = receipt?.status.slice(2) === '1' ? 'Sucess' : 'Fail';
    const blockNumber = String(parseInt(transfer.blockNumber.slice(2), 16));
    const amount = String(convertToFormatEther(transfer.amount, chain?.nativeCurrency.symbol) ?? '0 ETH');

    return {
      hash: transfer.hash,
      status: status,
      method: tx?.method ?? '',
      blockNumber: blockNumber,
      dateTime: dateTime,
      from: transfer.from,
      to: transfer.to,
      amount: amount,
    };
  });
}

export function mapToNftTransferCsvRows(
  txs: OtterscanTransaction[],
  receipts: OtterscanReceipt[],
  nftTransfers: NftTokenType[],
): NftTransferCsvRow[] {
  return Object.entries(nftTransfers).map(([, transfer]): NftTransferCsvRow => {
    const dateTime = formatDateTime(BigInt(transfer?.timestamp));
    const tx = txs.find((tx) => transfer.hash === tx.hash);
    const receipt = receipts.find((r) => r.transactionHash === transfer.hash);
    const status = receipt?.status.slice(2) === '1' ? 'Sucess' : 'Fail';
    const blockNumber = String(parseInt(transfer.blockNumber.slice(2), 16));

    return {
      hash: transfer.hash,
      status: status,
      method: tx?.method ?? '',
      blockNumber: blockNumber,
      dateTime: dateTime,
      from: transfer.from,
      to: transfer.to,
      type: transfer.type,
    };
  });
}

export function formatDateTime(timestamp: bigint) {
  return format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd H:mm:ss');
}

export function handleDownload(txs: OtterscanTransaction[], receipts: OtterscanReceipt[], chain: Chain, fileName: string) {
  const csvHeader = ['Transaction Hash', 'Status', 'Method', 'Blockno', 'Date Time', 'From', 'To', 'Amount', 'Txn Fee'];

  const rows = mapToTransactionCsvRows(txs, receipts, chain);

  const csvContent = [csvHeader, ...rows.map((row) => Object.values(row))].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function searchTransactions(address: string, direction: 'before' | 'after', offset = 0, limit = 25) {
  const method = direction === 'before' ? 'ots_searchTransactionsBefore' : 'ots_searchTransactionsAfter';

  const response = await fetch('http://100.118.195.120:48546', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params: [address, offset, limit],
    }),
  });

  const data = await response.json();
  return data;
}
