'use client';

import { ReactNode } from 'react';
import InteractTab from '@/features/Packages/Tabs/InteractTab';
import { useRouter } from 'next/router';
import PageLoading from '@/components/PageLoading';

function WrapperInteractLayout({ children }: { children: ReactNode }) {
  return <InteractTab>{children}</InteractTab>;
}

export default function InteractLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  return router.isReady ? (
    <WrapperInteractLayout>{children}</WrapperInteractLayout>
  ) : (
    <PageLoading />
  );
}
