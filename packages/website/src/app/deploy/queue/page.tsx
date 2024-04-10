import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/QueueTransactionsPage');
  },
  {
    ssr: false,
  }
);

export const metadata: Metadata = {
  title: 'Cannon | Queue Transactions',
  description: 'Queue Transactions',
  openGraph: {
    title: 'Cannon | Queue Transactions',
    description: 'Queue Transactions',
  },
};

export default function QueueTransactions() {
  return <NoSSR />;
}
