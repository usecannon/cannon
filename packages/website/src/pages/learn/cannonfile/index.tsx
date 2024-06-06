import { DocsCannonfilesPage } from '@/features/Docs/DocsCannonfilesPage';
import { ReactElement } from 'react';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

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
      <DocsCannonfilesPage />
    </>
  );
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
