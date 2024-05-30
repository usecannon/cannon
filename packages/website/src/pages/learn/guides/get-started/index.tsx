import { GetStartedPage } from '@/features/GetStarted/GetStartedPage';
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
        title="Cannon | Get Started"
        description="Get Started"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Get Started',
          description: 'Get Started',
        }}
      />
      <GetStartedPage />
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
