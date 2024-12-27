import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import { useParams } from 'next/navigation';

import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import Interact from '@/features/Packages/Interact';
import NameTagVariantLayout from '@/pages/packages/[name]/[tag]/[variant]/NameTagVariantLayout';

export default function InteractPage() {
  const params = useParams();

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Code"
        description="Package | Code"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Package',
          description: 'Package',
        }}
      />
      {params == null ? <PageLoading /> : <Interact />}
    </>
  );
}

InteractPage.getLayout = function getLayout(page: ReactElement) {
  return <NameTagVariantLayout>{page}</NameTagVariantLayout>;
};
