'use client';

import { PropsWithChildren } from 'react';
import InteractTab from '@/features/Packages/Tabs/InteractTab';
import PageLoading from '@/components/PageLoading';
import { useParams } from 'next/navigation';

export default function PackageInteractModuleLayout({
  children,
}: PropsWithChildren) {
  const params = useParams();
  return params == null ? (
    <PageLoading />
  ) : (
    <InteractTab>{children}</InteractTab>
  );
}
