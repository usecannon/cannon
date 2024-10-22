import { ReactElement, Suspense } from 'react';
import Layout from './_layout';
import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';

const DynamicDocsLandingPage = dynamic(
  () => import('@/features/Docs/DocsLandingPage'),
  {
    ssr: false,
  }
);

export default function Docs() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Docs"
        description="Docs"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Docs',
          description: 'Docs',
        }}
      />
      <Suspense fallback={<PageLoading />}>
        <DynamicDocsLandingPage />
      </Suspense>
    </>
  );
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
