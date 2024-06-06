import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import Layout from '../../../../../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/TransactionDetailsPage');
  },
  {
    ssr: false,
  }
);

export default function TransactionDetails() {
  const params = useRouter().query;
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
      <NoSSR
        safeAddress={params.safeAddress as string}
        chainId={params.chainId as string}
        nonce={params.nonce as string}
        sigHash={params.sigHash as string}
      />
    </>
  );
}
TransactionDetails.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
