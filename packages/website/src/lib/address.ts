import { formatEther } from 'viem';
import { format } from 'date-fns';
import { Chain } from '@/types/Chain';
import { convertToFormatEther } from '@/lib/transaction';
import { TransactionRow, TransactionCsvRow, OtterscanTransaction, OtterscanReceipt } from '@/types/AddressList';
import { getSelectors } from '@/helpers/api';

export const tabs = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'tokentxns', label: 'Token Transfers (ERC-20)' },
  { id: 'nfttransfers', label: 'NFT Transfers' },
];

export type TabId = (typeof tabs)[number]['id'];

export async function getMethods(txs: OtterscanTransaction[]) {
  const inputs = txs.filter((tx: any) => tx.input !== '0x').map((tx: any) => tx.input.slice(0, 10));

  if (inputs.length) {
    const res = await getSelectors(inputs);

    return res.results;
  }

  return [];
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

export function formatDateTime(timestamp: bigint) {
  return format(new Date(Number(timestamp) * 1000), 'yyyy-MM-dd H:mm:ss');
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

export function mapToTransactionCsvRows(txs: OtterscanTransaction[], receipts: OtterscanReceipt[], chain: Chain) {
  return Object.entries(receipts).map(([, receipt]): TransactionCsvRow => {
    const tx = txs.find((tx) => receipt.transactionHash === tx.hash);
    const dateTime = formatDateTime(BigInt(receipt?.timestamp));
    const status = receipt?.status.slice(2) === '1' ? 'Sucess' : 'Fail';
    const txnFee =
      receipt?.gasUsed && tx?.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '';
    const blockNumber = String(parseInt(tx?.blockNumber.slice(2) ?? '0', 16));
    const amount = String(convertToFormatEther(tx?.value ?? 0n, chain?.nativeCurrency.symbol) ?? '0 ETH');

    return {
      hash: receipt.transactionHash,
      status: status,
      method: tx?.method ?? '',
      blockNumber: blockNumber,
      dateTime: dateTime,
      from: receipt.from,
      to: receipt.to ?? '',
      amount: amount,
      txnFee: txnFee,
    };
  });
}

function downloadCsv(headers: string[], rows: any[], fileName: string) {
  const csvContent = [headers, ...rows.map((row) => Object.values(row))].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function handleDownloadCsv(
  txs: OtterscanTransaction[],
  receipts: OtterscanReceipt[],
  chain: Chain,
  fileName: string
) {
  const headers = ['Transaction Hash', 'Status', 'Method', 'Blockno', 'Date Time', 'From', 'To', 'Amount', 'Txn Fee'];
  const rows = mapToTransactionCsvRows(txs, receipts, chain);

  downloadCsv(headers, rows, fileName);
}

export async function searchTransactions(
  url: string,
  address: string,
  direction: 'before' | 'after',
  offset = 0,
  limit = 25
) {
  const method = direction === 'before' ? 'ots_searchTransactionsBefore' : 'ots_searchTransactionsAfter';

  const response = await fetch(url, {
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

export async function fetchBlockPages(apiUrl: string, displayAddress: string, maxPagesSafety = 100): Promise<string[]> {
  const blocksSet = new Set<string>();
  let isLastPage = false;
  let block = 0;
  let iterations = 0;

  do {
    const data = await searchTransactions(apiUrl, displayAddress, 'before', block);

    const receipts = data.result?.receipts ?? [];
    if (!receipts.length) break;

    const lastReceipt = receipts[receipts.length - 1];
    const nextBlock = parseInt(lastReceipt.blockNumber.slice(2), 16);
    block = nextBlock;

    isLastPage = !!data.result?.lastPage;
    if (!isLastPage) {
      blocksSet.add(String(nextBlock));
    }

    iterations++;
    if (iterations > maxPagesSafety) {
      break;
    }
  } while (!isLastPage);

  return Array.from(blocksSet).sort((a, b) => Number(b) - Number(a));
}
