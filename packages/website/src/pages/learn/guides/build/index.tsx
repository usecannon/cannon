import { BuildPage } from '@/features/GetStarted/BuildPage';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function Home() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Build"
        description="Build"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Build',
          description: 'Build',
        }}
      />
      <BuildPage />
    </>
  );
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
