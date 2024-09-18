import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import { useParams } from 'next/navigation';

import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import Interact from '@/features/Packages/Interact';
import PackageNameTagVariantLayout from '@/pages/packages/[name]/[tag]/[variant]/_layout';
import PackageInteractModuleLayout from '@/pages/packages/[name]/[tag]/[variant]/interact/_layout';

export default function InteractPage() {
  const params = useParams();

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Package | Code"
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
  return (
    <PackageNameTagVariantLayout>
      <PackageInteractModuleLayout>{page}</PackageInteractModuleLayout>
    </PackageNameTagVariantLayout>
  );
};
