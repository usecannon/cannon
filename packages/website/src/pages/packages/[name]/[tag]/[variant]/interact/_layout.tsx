'use client';

import { ReactNode } from 'react';
import InteractTab from '@/features/Packages/Tabs/InteractTab';

export default function InteractLayout({ children }: { children: ReactNode }) {
  return <InteractTab>{children}</InteractTab>;
}
