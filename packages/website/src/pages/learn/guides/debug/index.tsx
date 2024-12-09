import { DebugPage } from '@/features/Debug/DebugPage';
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
        title="Cannon | Debugging Tips"
        description="Debugging Tips"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Debugging Tips',
          description: 'Debugging Tips',
        }}
      />
      <DebugPage />
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
