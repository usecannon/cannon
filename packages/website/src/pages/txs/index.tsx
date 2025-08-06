import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import AddressTransactionPage from '@/features/Txs/AddressTransactionPage';

export default function Transaction() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Transactions List"
        description="Transactions List"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Transactions List',
          description: 'Transactions List',
        }}
      />
      <AddressTransactionPage />
    </>
  );
}
