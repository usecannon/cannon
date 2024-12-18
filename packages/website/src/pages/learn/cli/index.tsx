import { ReactElement } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import { useRouter } from 'next/router';

// Dynamic import of DocsCliPage
const SSRDocsCliPage = dynamic(() => import('@/features/Docs/DocsCliPage'), {
  ssr: false,
});

export default function Docs() {
  const router = useRouter();
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
      {router.isReady ? <SSRDocsCliPage /> : <PageLoading />}
    </>
  );
}

Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
