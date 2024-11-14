import { RouterPage } from '@/features/Router/RouterPage';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../guideLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function Home() {
  return (
    <div className="py-10">
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
    </div>
  );
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
