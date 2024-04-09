import { DebugPage } from '@/features/Debug/DebugPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Debugging Tips',
  description: 'Debugging Tips',
  openGraph: {
    title: 'Cannon | Debugging Tips',
    description: 'Debugging Tips',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default function Home() {
  return <DebugPage />;
}
