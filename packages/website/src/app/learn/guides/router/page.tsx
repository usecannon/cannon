import { RouterPage } from '@/features/Router/RouterPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Synthetix Router',
  description: 'Synthetix Router',
  openGraph: {
    title: 'Cannon | Synthetix Router',
    description: 'Synthetix Router',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://usecannon.com/images/og.png',
      },
    ],
  },
};

export default function Home() {
  return <RouterPage />;
}
