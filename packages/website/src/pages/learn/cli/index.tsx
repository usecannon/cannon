import { ReactElement, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';

// Dynamic import of DocsCliPage
const DocsCliPage = dynamic(() => import('@/features/Docs/DocsCliPage'), {
  ssr: false,
});

export default function Docs() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | CLI Docs"
        description="CLI Docs"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | CLI Docs',
          description: 'CLI Docs',
        }}
      />
      <Suspense fallback={<PageLoading />}>
        <DocsCliPage />
      </Suspense>
    </>
  );
}

Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
