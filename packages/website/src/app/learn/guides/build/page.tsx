import { BuildPage } from '@/features/GetStarted/BuildPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Build',
  description: 'Build',
  openGraph: {
    title: 'Cannon | Build',
    description: 'Build',
    images: [
      {
        url: 'https://usecannon.com/images/og.png',
      },
    ],
  },
};

export default function Home() {
  return <BuildPage />;
}
