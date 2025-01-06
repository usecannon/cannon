'use client';

import { useStore } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { useExecutedTransactions } from '@/hooks/safe';
import { useInMemoryPagination } from '@/hooks/useInMemoryPagination';
import React, { useState } from 'react';
import { Transaction } from './Transaction';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Pencil } from 'lucide-react';

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
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Staged txs */}
      <div className="mb-8 p-6 bg-card border border-border rounded-lg">
        <div className="flex items-center mb-5">
          <h2 className="text-xl font-semibold">Staged Transactions</h2>
          <div className="flex items-center ml-auto space-x-2">
            <code className="font-mono text-muted-foreground text-xs">
              {settings.stagingUrl}
            </code>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {isLoadingSafeTxs ? (
          <Skeleton className="h-5 w-full" />
        ) : (
          currentSafe &&
          (staged.length === 0 ? (
            <p className="text-muted-foreground">
              There are no transactions queued on the selected safe.
            </p>
          ) : (
            <div
              id="staged-transactions-container"
              className="max-h-[350px] overflow-y-auto"
            >
              <InfiniteScroll
                dataLength={paginatedStagedTxs.length}
                next={fetchMoreStagedTxs}
                hasMore={hasMoreStagedTxs}
                loader={<Skeleton className="h-[60px] my-2" />}
                scrollableTarget="staged-transactions-container"
              >
                {paginatedStagedTxs.map((tx) => (
                  <Transaction
                    key={JSON.stringify(tx.txn)}
                    safe={currentSafe}
                    tx={tx.txn}
                    hideExternal={false}
                    isStaged
                  />
                ))}
              </InfiniteScroll>
            </div>
          ))
        )}
      </div>

      {/* Executed txs */}
      {currentSafe && (history.count ?? 0) > 0 && (
        <div className="mb-8 p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center mb-5">
            <h2 className="text-xl font-semibold">Executed Transactions</h2>
            <div className="flex items-center ml-auto space-x-2">
              <Switch
                id="cannon-only"
                checked={isChecked}
                onCheckedChange={setIsChecked}
              />
              <label
                htmlFor="cannon-only"
                className="text-sm text-muted-foreground"
              >
                Show Cannon transactions only
              </label>
            </div>
          </div>
          <div
            id="executed-transactions-container"
            className="max-h-[300px] overflow-y-auto"
          >
            <InfiniteScroll
              dataLength={paginatedExecutedTxs.length}
              next={fetchMoreExecutedTxs}
              hasMore={hasMoreExecutedTxs}
              loader={<div>Loading...</div>}
              scrollableTarget="executed-transactions-container"
              endMessage={
                <p className="text-muted-foreground text-center mt-4">
                  No more transactions to load.
                </p>
              }
            >
              {paginatedExecutedTxs.map((tx) => (
                <Transaction
                  key={tx.safeTxHash}
                  safe={currentSafe}
                  tx={tx}
                  hideExternal={isChecked}
                />
              ))}
            </InfiniteScroll>
          </div>
        </div>
      )}
    </div>
  );
}
