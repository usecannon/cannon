import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(() => import('@/features/Deploy/SignTransactionsPage'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Cannon | Sign Transactions',
  description: 'Sign Transactions',
  openGraph: {
    title: 'Cannon | Sign Transactions',
    description: 'Sign Transactions',
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

export default function SignTransactions() {
  return <NoSSR />;
}
