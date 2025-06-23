import { initialSelectorDecodeUrl } from '@/helpers/store';
import { TransactionRow } from '@/types/AddressList';
import { formatEther } from 'viem';
import { TokenTransferRow } from '@/types/AddressList';

export async function getMethods(txs: any[]) {
  const inputs = txs.filter((tx: any) => tx.input !== '0x').map((tx: any) => tx.input.slice(0, 10));
  const url = initialSelectorDecodeUrl + inputs.join(',');
  const response = await fetch(url);
  const names = await response.json();
  return names.results;
}

export function matchFunctionName(names: any, input: string) {
  let method = 'Transfer';
  if (input !== '0x') {
    const functionNames = names[input.slice(0, 10)];
    if (functionNames && functionNames.length > 0) {
      const functionName = functionNames[0];
      const methodname = functionNames.length > 0 ? functionName['name'] : input.slice(0, 10);
      const match = methodname.match(/([A-Za-z0-9]*)\(/);
      method = match[1];
    }
  }
  return method;
}
export function mapToTransactionLlist(txs: any[], receipts: any[], names: any) {
  return Object.entries(txs).map(([, tx]): TransactionRow => {
    const receipt = receipts.find((r) => r.transactionHash === tx.hash);
    const method = matchFunctionName(names, tx.input);

    return {
      detail: '',
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      from: tx.from,
      to: tx.to ? tx.to : '',
      amount: tx.value,
      age: receipt?.timestamp,
      method: method,
      txnFee: receipt?.gasUsed && tx.gasPrice ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(0, 10) : '',
      gasPrice: tx.gasPrice,
      contractAddress: receipt?.contractAddress,
    };
  });
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
