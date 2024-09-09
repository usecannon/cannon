import defaultSEO from '@/constants/defaultSeo';
import { NextSeo } from 'next-seo';
import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import Layout from './_layout';

const NoSSR = dynamic(() => import('@/features/Deploy/SignTransactionsPage'), {
  ssr: false,
});

export default function SignTransactions() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Sign Transactions"
        description="Sign Transactions"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Sign Transactions',
          description: 'Sign Transactions',
        }}
      />
      <NoSSR />
    </>
  );
}
SignTransactions.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
