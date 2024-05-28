'use client';

import { ReactNode } from 'react';
import CodeTab from '@/features/Packages/Tabs/CodeTab';

export default function CodeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CodeTab>{children}</CodeTab>
    </>
  );
}
