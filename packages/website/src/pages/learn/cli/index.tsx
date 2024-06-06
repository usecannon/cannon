import { DocsCliPage } from '@/features/Docs/DocsCliPage';
import { ReactElement } from 'react';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

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
      <DocsCliPage />
    </>
  );
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
