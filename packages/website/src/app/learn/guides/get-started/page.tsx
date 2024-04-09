import { GetStartedPage } from '@/features/GetStarted/GetStartedPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Get Started',
  description: 'Get Started',
  openGraph: {
    title: 'Cannon | Get Started',
    description: 'Get Started',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default function Home() {
  return <GetStartedPage />;
}
