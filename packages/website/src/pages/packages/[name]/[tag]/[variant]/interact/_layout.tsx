'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import InteractTab from '@/features/Packages/Tabs/InteractTab';

export default function InteractLayout({ children }: { children: ReactNode }) {
  const params = useRouter().query;
  return (
    <InteractTab
      name={decodeURIComponent(params.name as string)}
      tag={decodeURIComponent(params.tag as string)}
      variant={decodeURIComponent(params.variant as string)}
    >
      {children}
    </InteractTab>
  );
}
