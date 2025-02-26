import { AlterPage } from '@/features/Alter/AlterPage';
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
        title="Cannon | Manually Modifying the State"
        description="How to use the cannon alter command to make changes to deployments outside the regular deployment process."
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Manually Modifying the State',
          description:
            'How to use the cannon alter command to make changes to deployments outside the regular deployment process.',
        }}
      />
      <AlterPage />
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
