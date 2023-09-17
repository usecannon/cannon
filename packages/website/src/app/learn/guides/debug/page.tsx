import { DebugPage } from '@/features/Debug/DebugPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Debug a Protocol',
};

export default function Home() {
  return <DebugPage />;
}
