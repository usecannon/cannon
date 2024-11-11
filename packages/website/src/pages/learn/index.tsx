import { ReactElement } from 'react';
import Layout from './_layout';
import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import { useRouter } from 'next/router';

const DynamicDocsLandingPage = dynamic(
  () => import('@/features/Docs/DocsLandingPage'),
  {
    ssr: false,
  }
);

export default function Docs() {
  const router = useRouter();
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
      {router.isReady ? <DynamicDocsLandingPage /> : <PageLoading />}
    </>
  );
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
