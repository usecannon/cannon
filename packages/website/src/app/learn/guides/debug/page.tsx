import { DebugPage } from '@/features/Debug/DebugPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Debugging Tips',
};

export default function Home() {
  return <DebugPage />;
}
