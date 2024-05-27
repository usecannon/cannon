import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Layout from '../_layout';
import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CannonfileTab');
  },
  {
    ssr: false,
  }
);

export default function Cannonfile() {
  const params = useRouter().query;
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Package | Cannonfile"
        description="Package | Cannonfile"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Package | Cannonfile',
          description: 'Package | Cannonfile',
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

Cannonfile.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
