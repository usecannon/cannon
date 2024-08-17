import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import Layout from '../../../../../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';

const NoSSRTransactionDetailsPage = dynamic(
  async () => {
    return import('@/features/Deploy/TransactionDetailsPage');
  },
  {
    ssr: false,
  }
);

export default function TransactionDetails() {
  const router = useRouter();
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Transaction Details"
        description="Transaction Details"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Transaction Details',
          description: 'Transaction Details',
        }}
      />
      {router.isReady ? <NoSSRTransactionDetailsPage /> : <PageLoading />}
    </>
  );
}
TransactionDetails.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
