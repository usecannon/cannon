import dynamic from 'next/dynamic';
import { Address } from 'viem';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

import Layout from '../../_layout';
import NestedLayout from '../_layout';

const NoSSR = dynamic(() => import('@/features/Packages/CodePage'), {
  ssr: false,
});

export default function Interact() {
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
        moduleName={decodeURIComponent(params.moduleName as string)}
        contractAddress={
          decodeURIComponent(params.contractAddress as string) as Address
        }
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
