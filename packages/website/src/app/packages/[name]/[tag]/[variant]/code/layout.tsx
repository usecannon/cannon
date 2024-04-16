'use client';

import { ReactNode } from 'react';
import CodeTab from '@/features/Packages/Tabs/CodeTab';

export default function CodeLayout({
  children,
}: {
  children: ReactNode;
  params: {
    name: string;
    tag: string;
    variant: string;
  };
}) {
  return (
    <>
      <CodeTab>{children}</CodeTab>
    </>
  );
}
