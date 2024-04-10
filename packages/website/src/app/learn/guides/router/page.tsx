import { RouterPage } from '@/features/Router/RouterPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Synthetix Router',
  description: 'Synthetix Router',
  openGraph: {
    title: 'Cannon | Synthetix Router',
    description: 'Synthetix Router',
  },
};

export default function Home() {
  return <RouterPage />;
}
