import { SignTransactionsPage } from '@/features/Deploy/SignTransactionsPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Sign Transactions',
};

export default function Deploy() {
  return <SignTransactionsPage />;
}
