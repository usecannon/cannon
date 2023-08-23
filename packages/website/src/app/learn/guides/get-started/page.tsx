import { GetStartedPage } from '@/features/GetStarted/GetStartedPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Get Started',
};

export default function Home() {
  return <GetStartedPage />;
}
