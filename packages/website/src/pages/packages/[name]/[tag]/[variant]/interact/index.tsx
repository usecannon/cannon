import { ReactElement } from 'react';
import Layout from '../_layout';
import NestedLayout from './_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function Interact() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Package"
        description="Package"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Package',
          description: 'Package',
        }}
      />
    </>
  );
}

Interact.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
