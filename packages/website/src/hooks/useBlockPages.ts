import { useState, useCallback } from 'react';
import { searchTransactions } from '@/lib/address';
import { MAX_PAGE_SIZE } from '@/constants/pagination';

type PageCache = {
  pages: string[]; // block numbers for each page boundary (index 0 = page 2's block, etc.)
  totalPages: number | null; // null means we haven't reached the last page yet
  totalTxs: number;
};

/**
 * Lazy-loading page boundary tracker.
 * Instead of fetching all pages upfront, we discover page boundaries as we navigate.
 * Pages are stored as block numbers - page N's block is the last block of page N-1.
 */
export function useBlockPages(apiUrl: string, address: string) {
  const [cache, setCache] = useState<PageCache>({
    pages: [],
    totalPages: null,
    totalTxs: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Fetch page boundaries up to a target page index
  // This is called when we need a page that we haven't discovered yet
  const ensurePage = useCallback(
    async (targetPageIndex: number) => {
      // If we already have this page or know we've reached the end, no need to fetch
      if (cache.pages.length >= targetPageIndex || cache.totalPages !== null) {
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const newPages: string[] = [...cache.pages];
        let totalTxs = cache.totalTxs;
        let block = newPages.length > 0 ? Number(newPages[newPages.length - 1]) : 0;
        let isLastPage = false;

        // Fetch pages until we have the target or reach the end
        while (newPages.length < targetPageIndex && !isLastPage) {
          const data = await searchTransactions(apiUrl, address, 'before', block);

          const receipts = data.result?.receipts ?? [];
          if (!receipts.length) {
            isLastPage = true;
            break;
          }

          totalTxs += receipts.length;
          isLastPage = !!data.result?.lastPage;

          if (!isLastPage) {
            const lastReceipt = receipts[receipts.length - 1];
            const nextBlock = String(parseInt(lastReceipt.blockNumber.slice(2), 16));
            newPages.push(nextBlock);
            block = Number(nextBlock);
          }

          // Safety limit
          if (newPages.length >= MAX_PAGE_SIZE - 1) {
            break;
          }
        }

        setCache({
          pages: newPages,
          totalPages: isLastPage ? newPages.length + 1 : null,
          totalTxs,
        });
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, address, cache],
  );

  // Get the block number to use for fetching a specific page (1-indexed)
  const getBlockForPage = useCallback(
    (pageIndex: number): string => {
      if (pageIndex <= 1) return '0';
      // Page 2 uses pages[0], page 3 uses pages[1], etc.
      return cache.pages[pageIndex - 2] ?? '0';
    },
    [cache.pages],
  );

  // Check if a page exists (for disabling next button)
  const hasPage = useCallback(
    (pageIndex: number): boolean => {
      if (pageIndex <= 1) return true; // Page 1 always exists
      if (cache.totalPages !== null) {
        return pageIndex <= cache.totalPages;
      }
      // If we haven't reached the end, assume the page might exist
      return true;
    },
    [cache.totalPages],
  );

  return {
    pages: cache.pages,
    totalPages: cache.totalPages,
    totalTxs: cache.totalTxs,
    isLoading,
    isError,
    ensurePage,
    getBlockForPage,
    hasPage,
  };
}
