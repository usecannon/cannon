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
  const currentSafe = useStore((s) => s.currentSafe);
  const settings = useStore((s) => s.settings);
  const stagedTransactions = useSafeTransactions(currentSafe, 10000);
  const executedTransactions = useExecutedTransactions(currentSafe);
  const [isChecked, setIsChecked] = useState(true);

  const {
    paginatedData: paginatedStagedTxs,
    hasMore: hasMoreStagedTxs,
    fetchMoreData: fetchMoreStagedTxs,
  } = useInMemoryPagination(stagedTransactions.staged, 20);

  const {
    paginatedData: paginatedExecutedTxs,
    hasMore: hasMoreExecutedTxs,
    fetchMoreData: fetchMoreExecutedTxs,
  } = useInMemoryPagination(executedTransactions.data.results, 20);

  if (!currentSafe) return null;

  return (
    <div className="container flex flex-col mx-auto py-8 max-w-4xl space-y-8 px-4">
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
          {stagedTransactions.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : !stagedTransactions.staged.length ? (
            <div className="flex flex-col items-center justify-center">
              <p className="p-4 py-8 text-muted-foreground text-center">
                There are no transactions queued on this Safe.
              </p>
            </div>
          ) : (
            <div
              className="max-h-[40dvh] overflow-y-auto"
              id="staged-transactions-container"
            >
              <InfiniteScroll
                dataLength={paginatedStagedTxs.length}
                next={fetchMoreStagedTxs}
                hasMore={hasMoreStagedTxs}
                loader={
                  <div className="p-2 text-xs text-muted-foreground">
                    Loading more transactions...
                  </div>
                }
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
          {executedTransactions.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : executedTransactions.data.results.length === 0 ? (
            <p className="p-4 text-muted-foreground text-center py-8">
              No executed transactions were found for this Safe.
            </p>
          ) : (
            <div
              className="overflow-y-auto"
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
    </div>
  );
}
