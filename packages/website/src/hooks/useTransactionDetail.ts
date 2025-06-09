import { Hash, createPublicClient, http } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { initialSelectorDecodeUrl } from '@/helpers/store';
import { useQuery } from '@tanstack/react-query';

export function useTransactionDetails(chainId: string | string[] | undefined, txHash: string | string[] | undefined) {
  const chainIdStr = Array.isArray(chainId) ? chainId[0] : chainId;
  const txHashStr = Array.isArray(txHash) ? txHash[0] : txHash;
  const { getChainById } = useCannonChains();

  return useQuery({
    queryKey: ['transaction-details', chainIdStr, txHashStr],
    queryFn: async () => {
      if (!chainIdStr || !txHashStr || !txHashStr.startsWith('0x')) return null;
      const chain = getChainById(Number(chainId));
      if (!chain) throw new Error(`Chain ${chainId} not found`);

      const publicClient = createPublicClient({
        chain,
        transport: http(chain?.rpcUrls.default.http[0]),
      });

      const tx = await publicClient.getTransaction({
        hash: txHashStr as Hash,
      });
      const txReceipt = await publicClient.getTransactionReceipt({
        hash: txHashStr as Hash,
      });
      const txBlock = await publicClient.getBlock({
        blockNumber: txReceipt.blockNumber,
      });

      const latestBlockNumber = await publicClient.getBlockNumber();

      let txNames = {};
      if (txReceipt.logs.length > 0) {
        const topics = txReceipt.logs.map((log: any) => log.topics[0]?.slice(0, 10));
        const url = initialSelectorDecodeUrl + topics.join(',');
        const response = await fetch(url);
        const names = await response.json();
        txNames = names.results;
      }

      return {
        tx,
        txReceipt,
        txBlock,
        latestBlockNumber,
        txNames,
        chain,
      };
    },
    enabled: !!chainIdStr && !!txHashStr,
  });
}
