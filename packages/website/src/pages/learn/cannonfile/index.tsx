import { ReactElement } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import { useRouter } from 'next/router';

const DynamicDocsCannonfilesPage = dynamic(
  () => import('@/features/Docs/DocsCannonfilesPage'),
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
        title="Cannon | Cannonfile Docs"
        description="Cannonfile Docs"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Cannonfile Docs',
          description: 'Cannonfile Docs',
        }}
      />
      {router.isReady ? <DynamicDocsCannonfilesPage /> : <PageLoading />}
    </>
  );
}

Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
