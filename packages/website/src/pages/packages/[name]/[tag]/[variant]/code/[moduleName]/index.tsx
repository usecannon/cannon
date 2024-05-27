//import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Address } from 'viem';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';

import Layout from '../../_layout';
import NestedLayout from '../_layout';

const NoSSR = dynamic(() => import('@/features/Packages/CodePage'), {
  ssr: false,
});

/*export const metadata: Metadata = {
  title: 'Cannon | Package | Code',
  description: 'Package | Code',
  openGraph: {
    title: 'Cannon | Package | Code',
    description: 'Package',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://usecannon.com/images/og.png',
      },
    ],
  },
  };*/

export default function Interact() {
  const params = useRouter().query;
  return (
    <NoSSR
      name={decodeURIComponent(params.name as string)}
      tag={decodeURIComponent(params.tag as string)}
      variant={decodeURIComponent(params.variant as string)}
      moduleName={decodeURIComponent(params.moduleName as string)}
      contractAddress={
        decodeURIComponent(params.contractAddress as string) as Address
      }
    />
  );
}

Interact.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
