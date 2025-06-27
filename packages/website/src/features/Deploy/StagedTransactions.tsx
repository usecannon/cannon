import { useSafeTransactions } from '@/hooks/backend';
import { SafeDefinition, useStore } from '@/helpers/store';
import { TransactionTable } from './Transaction';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import TableSkeleton from '@/components/ui/Skeletons/Table';

export function StagedTransactions({
  currentSafe,
}: {
  currentSafe: SafeDefinition;
}) {
  const settings = useStore((s) => s.settings);
  const stagedTransactions = useSafeTransactions(currentSafe, 10000);

  return (
    <div className="flex flex-col border border-border rounded-sm overflow-hidden">
      <div className="flex flex-row px-3 py-2 items-center justify-between bg-accent/50">
        <div className="flex items-center">
          <h2 className="font-medium">Staged Transactions</h2>
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
          <span>
            Using signature server{' '}
            <code className="font-mono">{settings.cannonSafeBackendUrl}</code>
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
          <TableSkeleton />
        ) : !stagedTransactions.staged.length ? (
          <div className="flex flex-col items-center justify-center">
            <p className="p-4 py-8 text-muted-foreground text-center">
              There are no transactions queued on this Safe.
            </p>
          </div>
        ) : (
          <div className="max-h-[40dvh] overflow-y-auto">
            <TransactionTable
              transactions={stagedTransactions.staged.map((tx) => tx.txn)}
              safe={currentSafe}
              isStaged
            />
          </div>
        )}
      </div>
    </div>
  );
}
