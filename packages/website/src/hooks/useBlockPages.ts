import { useQuery } from '@tanstack/react-query';
import { searchTransactions } from '@/lib/address';
import { MAX_PAGE_SIZE } from '@/constants/pagination';

export function useBlockPages(apiUrl: string, address: string) {
  const maxPagesSafety = MAX_PAGE_SIZE - 1;
  return useQuery({
    queryKey: ['block-apges', apiUrl, address],
    queryFn: async () => {
      if (!apiUrl) {
        return { blocks: [], totalTxs: 0 };
      }
      const blocksSet = new Set<string>();
      let isLastPage = false;
      let block = 0;
      let iterations = 0;
      let totalTxs = 0;

      do {
        const data = await searchTransactions(apiUrl, address, 'before', block);

        const receipts = data.result?.receipts ?? [];
        if (!receipts.length) break;

        totalTxs += receipts.length;

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

      return { pages: Array.from(blocksSet).sort((a, b) => Number(b) - Number(a)), totalTxs };
    },
    enabled: !!apiUrl && !!address,
  });
}
