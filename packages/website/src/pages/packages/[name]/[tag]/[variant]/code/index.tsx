import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import Layout from '../_layout';
import NestedLayout from './_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(() => import('@/features/Packages/CodePage'), {
  ssr: false,
});

export default function Code() {
  const params = useRouter().query;
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Package | Code"
        description="Package | Code"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Package',
          description: 'Package',
        }}
      />
      <NoSSR
        name={decodeURIComponent(params.name as string)}
        tag={decodeURIComponent(params.tag as string)}
        variant={decodeURIComponent(params.variant as string)}
      />
    </>
  );
}
Code.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
