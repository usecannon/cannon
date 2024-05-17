//import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import Layout from './_layout';

const NoSSR = dynamic(() => import('@/features/Deploy/SignTransactionsPage'), {
  ssr: false,
});

/*export const metadata: Metadata = {
  title: 'Cannon | Sign Transactions',
  description: 'Sign Transactions',
  openGraph: {
    title: 'Cannon | Sign Transactions',
    description: 'Sign Transactions',
  },
  };*/

export default function SignTransactions() {
  return <NoSSR />;
}
SignTransactions.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
