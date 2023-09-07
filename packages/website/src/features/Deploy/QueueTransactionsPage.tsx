'use client';

import dynamic from 'next/dynamic';
import WithSafe from './WithSafe';

const QueueTransactions = dynamic(() => import('./QueueTransactions'), {
  ssr: false,
});

export function QueueTransactionsPage() {
  return (
    <WithSafe>
      <QueueTransactions />
    </WithSafe>
  );
}
