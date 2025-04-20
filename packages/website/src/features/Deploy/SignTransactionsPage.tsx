'use client';

import { useStore } from '@/helpers/store';
import React from 'react';
import { ExecutedTransactions } from '@/features/Deploy/ExecutedTransactions';
import { StagedTransactions } from '@/features/Deploy/StagedTransactions';

export default function SignTransactionsPage() {
  const currentSafe = useStore((s) => s.currentSafe);

  if (!currentSafe) return null;

  return (
    <div className="container flex flex-col mx-auto py-8 max-w-4xl space-y-8 px-4">
      <StagedTransactions currentSafe={currentSafe} />
      <ExecutedTransactions currentSafe={currentSafe} />
    </div>
  );
}
