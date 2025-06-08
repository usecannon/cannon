import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import TransactionPage from '@/features/Txn/TransactionPage';

export default function Transaction() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Transaction Detail"
        description="Transaction Detail"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Transaction Detail',
          description: 'Transaction Detail',
        }}
      />
      <TransactionPage />
    </>
  );
}
