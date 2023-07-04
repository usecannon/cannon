import { GetStartedPage } from '@/features/GetStarted/GetStartedPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Get started',
  description: "let's start with Cannon",
};

export default function Home() {
  return <GetStartedPage />;
}
