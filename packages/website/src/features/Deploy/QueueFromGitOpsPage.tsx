'use client';

import dynamic from 'next/dynamic';
import WithSafe from './WithSafe';

const QueueFromGitOps = dynamic(() => import('./QueueFromGitOps'), {
  ssr: false,
});

export function QueueFromGitOpsPage() {
  return (
    <WithSafe>
      <QueueFromGitOps />
    </WithSafe>
  );
}
