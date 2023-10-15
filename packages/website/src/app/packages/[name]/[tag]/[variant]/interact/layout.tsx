'use client';

import { ReactNode } from 'react';
import InteractTab from '@/features/Packages/Tabs/InteractTab';

export default function InteractLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: {
    name: string;
    tag: string;
    variant: string;
  };
}) {
  return <InteractTab {...params}>{children}</InteractTab>;
}
