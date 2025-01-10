'use client';

import { useStore } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { useExecutedTransactions } from '@/hooks/safe';
import { useInMemoryPagination } from '@/hooks/useInMemoryPagination';
import React, { useState } from 'react';
import { TransactionTable } from './Transaction';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export default function SignTransactionsPage() {
  return <SignTransactions />;
}

function SignTransactions() {
  const currentSafe = useStore((s) => s.currentSafe);
  const settings = useStore((s) => s.settings);
  const { staged, isLoading: isLoadingSafeTxs } = useSafeTransactions(
    currentSafe,
    10000
  );
  const { data: history } = useExecutedTransactions(currentSafe);
  const [isChecked, setIsChecked] = useState(true);

  const {
    paginatedData: paginatedStagedTxs,
    hasMore: hasMoreStagedTxs,
    fetchMoreData: fetchMoreStagedTxs,
  } = useInMemoryPagination(staged, 5);

  const {
    paginatedData: paginatedExecutedTxs,
    hasMore: hasMoreExecutedTxs,
    fetchMoreData: fetchMoreExecutedTxs,
  } = useInMemoryPagination(history.results, 5);

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      {/* Staged txs */}
      <div className="flex flex-col border border-border rounded-sm overflow-hidden">
        <div className="flex flex-row px-3 py-2 items-center justify-between bg-accent/50">
          <div className="flex items-center">
            <h2 className="font-medium">Staged Transactions</h2>
          </div>
          <div className="flex items-center text-xs text-muted-foreground gap-1.5">
            <span>
              Signatures shared at{' '}
              <code className="font-mono">{settings.stagingUrl}</code>
            </span>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="bg-background">
          {isLoadingSafeTxs ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            currentSafe &&
            (staged.length === 0 ? (
              <p className="p-4 text-muted-foreground text-center py-8">
                There are no transactions queued on this Safe.
              </p>
            ) : (
              <div
                className="max-h-[40dvh] overflow-y-auto"
                id="staged-transactions-container"
              >
                <InfiniteScroll
                  dataLength={paginatedStagedTxs.length}
                  next={fetchMoreStagedTxs}
                  hasMore={hasMoreStagedTxs}
                  loader={<Skeleton className="h-[60px] my-2" />}
                  scrollableTarget="staged-transactions-container"
                >
                  <TransactionTable
                    transactions={paginatedStagedTxs.map((tx) => tx.txn)}
                    safe={currentSafe}
                    hideExternal={false}
                    isStaged
                  />
                </InfiniteScroll>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Executed txs */}
      <div className="flex flex-col border border-border rounded-sm overflow-hidden">
        <div className="flex flex-row px-3 py-2 items-center justify-between bg-accent/50">
          <div className="flex items-center">
            <h2 className="font-medium">Executed Transactions</h2>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="cannon-only"
              className="scale-75"
              checked={isChecked}
              onCheckedChange={setIsChecked}
            />
            <label
              htmlFor="cannon-only"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Show Cannon transactions only
            </label>
          </div>
        </div>
        <div className="bg-background">
          {!currentSafe || !history.results ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : history.results.length === 0 ? (
            <p className="p-4 text-muted-foreground text-center py-8">
              No executed transactions were found for this Safe.
            </p>
          ) : (
            <div
              className="max-h-[40dvh] overflow-y-auto"
              id="executed-transactions-container"
            >
              <InfiniteScroll
                dataLength={paginatedExecutedTxs.length}
                next={fetchMoreExecutedTxs}
                hasMore={hasMoreExecutedTxs}
                loader={
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                }
                scrollableTarget="executed-transactions-container"
              >
                <TransactionTable
                  transactions={paginatedExecutedTxs}
                  safe={currentSafe}
                  hideExternal={isChecked}
                />
              </InfiniteScroll>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
