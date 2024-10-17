import { useState, useMemo, useCallback } from 'react';

interface PaginationResult<T> {
  paginatedData: T[];
  hasMore: boolean;
  fetchMoreData: () => void;
}

export function useInMemoryPagination<T>(data: T[], itemsPerPage: number): PaginationResult<T> {
  const [displayedItems, setDisplayedItems] = useState(itemsPerPage);

  const paginatedData = useMemo(() => {
    // Return all data up to the current number of displayed items
    return data.slice(0, displayedItems);
  }, [data, displayedItems]);

  const hasMore = useMemo(() => {
    return displayedItems < data.length;
  }, [data.length, displayedItems]);

  const fetchMoreData = useCallback(() => {
    setDisplayedItems((prevItems) => Math.min(prevItems + itemsPerPage, data.length));
  }, [itemsPerPage, data.length]);

  return { paginatedData, hasMore, fetchMoreData };
}
