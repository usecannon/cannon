import { useQuery } from '@tanstack/react-query';
import { searchTransactions, getMethods, matchFunctionName } from '@/lib/address';
import { OtterscanTransaction, OtterscanReceipt } from '@/types/AddressList';

export function useAddressTransactions(address: string) {
  return useQuery({
    queryKey: ['transaction-details', address],
    queryFn: async () => {
      const data = await searchTransactions(address, 'before');
      const rawTxs = data.result.txs;
      const methods = await getMethods(rawTxs);
      const txs: OtterscanTransaction[] = rawTxs.map((tx:any) => {
        const selector = tx.input.slice(0,10);
        const method = matchFunctionName(methods, tx.input);
        return {
            ...tx,
            method: method, 
        }
      })
      const receipts: OtterscanReceipt[] = data.result.receipts;
      const oldData = await searchTransactions(address, 'after');
      const oldReceipts: OtterscanReceipt[] = oldData.result.receipts;
      return { txs, receipts, oldReceipts };
    },
    enabled: !!address,
  });
}
