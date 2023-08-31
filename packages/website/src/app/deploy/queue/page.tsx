import { QueueTransactionsPage } from '@/features/Deploy/QueueTransactionsPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Queue Transactions',
};

export default function Home() {
  return <QueueTransactionsPage />;
}
