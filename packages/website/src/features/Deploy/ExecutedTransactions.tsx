import { useExecutedTransactions } from '@/hooks/safe';
import { useInMemoryPagination } from '@/hooks/useInMemoryPagination';
import { TransactionTable } from './Transaction';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { SafeDefinition } from '@/helpers/store';
import TableSkeleton from '@/components/ui/Skeletons/Table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export function ExecutedTransactions({
  currentSafe,
}: {
  currentSafe: SafeDefinition;
}) {
  const executedTransactions = useExecutedTransactions(currentSafe);
  const [isChecked, setIsChecked] = useState(true);

  const {
    paginatedData: paginatedExecutedTxs,
    hasMore: hasMoreExecutedTxs,
    fetchMoreData: fetchMoreExecutedTxs,
  } = useInMemoryPagination(executedTransactions.data?.results || [], 20);

  const noResults =
    !executedTransactions.data ||
    executedTransactions.data?.results.length === 0;

  if (
    executedTransactions.error &&
    executedTransactions.error.message === 'SAFE_CHAIN_NOT_SUPPORTED'
  ) {
    return (
      <div className="flex flex-col border border-border rounded-sm overflow-hidden">
        <div className="flex flex-row px-3 py-2 items-center justify-between bg-accent/50">
          <div className="flex items-center">
            <h2 className="font-medium">Executed Transactions</h2>
          </div>
        </div>
        <div className="p-4 text-muted-foreground text-center py-8">
          <Alert variant="warning">
            <AlertTitle>Unsupported Safe Chain</AlertTitle>
            <AlertDescription>
              You can configure a custom Safe Transaction Service URL on the{' '}
              <Link href="/settings" className="underline">
                Settings
              </Link>{' '}
              page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-border rounded-sm overflow-hidden">
      <div className="flex flex-row px-3 py-2 items-center justify-between bg-accent/50">
        <div className="flex items-center">
          <h2 className="font-medium">Executed Transactions</h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isChecked}
            onCheckedChange={setIsChecked}
            label="Show Cannon transactions only"
          />
        </div>
      </div>
      <div className="bg-background">
        {executedTransactions.isLoading ? (
          <TableSkeleton />
        ) : noResults ? (
          <p className="p-4 text-muted-foreground text-center py-8">
            No executed transactions were found for this Safe.
          </p>
        ) : (
          <div
            className="overflow-y-auto max-h-[418px]"
            id="executed-transactions-container"
          >
            <InfiniteScroll
              dataLength={paginatedExecutedTxs.length}
              next={fetchMoreExecutedTxs}
              hasMore={hasMoreExecutedTxs}
              loader={
                <div className="p-2 text-xs text-muted-foreground">
                  Loading more transactions...
                </div>
              }
              scrollableTarget="executed-transactions-container"
            >
              <div className="overflow-x-auto">
                <TransactionTable
                  transactions={paginatedExecutedTxs}
                  safe={currentSafe}
                  hideExternal={isChecked}
                />
              </div>
            </InfiniteScroll>
          </div>
        )}
      </div>
    </div>
  );
}
