import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import AddressPage from '@/features/Address/AddressPage';

export default function Transaction() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Address Information"
        description="Address Information"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Address Information',
          description: 'Address Information',
        }}
      />
      <AddressPage />
    </>
  );
}
