import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import TransactionDetail from './TransactionDetail';

const NoSSR = dynamic(() => import('@/features/Ipfs/Download'), {
  ssr: false,
});

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
      <TransactionDetail />
    </>
  );
}
