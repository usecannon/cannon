import { TransactionDetailsPage } from '@/features/Deploy/TransactionDetailsPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Transaction Details',
};

export default function Deploy() {
  return <TransactionDetailsPage />;
}
