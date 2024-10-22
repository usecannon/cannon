import { ReactElement, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';

const DynamicDocsCannonfilesPage = dynamic(
  () => import('@/features/Docs/DocsCannonfilesPage'),
  {
    ssr: false,
  }
);

export default function Docs() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Cannonfile Docs"
        description="Cannonfile Docs"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Cannonfile Docs',
          description: 'Cannonfile Docs',
        }}
      />
      <Suspense fallback={<PageLoading />}>
        <DynamicDocsCannonfilesPage />
      </Suspense>
    </>
  );
}

Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
