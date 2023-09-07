'use client';

import SignTransactions from './SignTransactions';
import WithSafe from './WithSafe';

export function SignTransactionsPage() {
  return (
    <WithSafe>
      <SignTransactions />
    </WithSafe>
  );
}
