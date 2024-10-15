import { RouterPage } from '@/features/Router/RouterPage';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../guideLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function Home() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Synthetix Router"
        description="Synthetix Router"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Synthetix Router',
          description: 'Synthetix Router',
        }}
      />
      <RouterPage />
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
