import { useQuery } from '@tanstack/react-query';
import { searchTransactions, getMethods, matchFunctionName } from '@/lib/address';
import { OtterscanTransaction, OtterscanReceipt } from '@/types/AddressList';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

export function useAddressTransactions(chainId: number, address: string) {
  // get the otterscan API from the settings store
  const cannonChains = useCannonChains();

  const apiUrl = cannonChains.otterscanApis[chainId]?.rpcUrl;

  return useQuery({
    queryKey: ['transaction-details', apiUrl, address],
    queryFn: async () => {
      if (!apiUrl) {
        return null;
      }

      const data = await searchTransactions(apiUrl, address, 'before');
      if (!data) {
        return null;
      }

      const rawTxs = data.result.txs;
      const methods = await getMethods(rawTxs);
      const txs: OtterscanTransaction[] = rawTxs.map((tx: any) => {
        const method = matchFunctionName(methods, tx.input);
        return {
          ...tx,
          method: method,
        };
      });
      const receipts: OtterscanReceipt[] = data.result.receipts;
      const oldData = await searchTransactions(apiUrl, address, 'after');
      const oldReceipts: OtterscanReceipt[] = oldData.result.receipts;
      return { txs, receipts, oldReceipts };
    },
    enabled: !!chainId && !!address,
  });
}
