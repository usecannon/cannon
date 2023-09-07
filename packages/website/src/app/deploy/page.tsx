import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/SignTransactionsPage');
  },
  {
    ssr: false,
  }
);

export const metadata: Metadata = {
  title: 'Cannon | Sign Transactions',
};

export default function SignTransactions() {
  return <NoSSR />;
}
