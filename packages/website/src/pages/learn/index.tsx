import { DocsLandingPage } from '@/features/Docs/DocsLandingPage';
import { ReactElement } from 'react';
import Layout from './_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

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
      <DocsLandingPage />
    </>
  );
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
