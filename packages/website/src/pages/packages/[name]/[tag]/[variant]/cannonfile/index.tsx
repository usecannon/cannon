//import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Layout from '../_layout';
import { ReactElement } from 'react';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CannonfileTab');
  },
  {
    ssr: false,
  }
);
/*export const metadata: Metadata = {
  title: 'Cannon | Package | Cannonfile',
  description: 'Package | Cannonfile',
  openGraph: {
    title: 'Cannon | Package | Cannonfile',
    description: 'Package | Cannonfile',
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

export default function Cannonfile() {
  const params = useRouter().query;
  return (
    <NoSSR
      name={decodeURIComponent(params.name as string)}
      tag={decodeURIComponent(params.tag as string)}
      variant={decodeURIComponent(params.variant as string)}
    />
  );
}

Cannonfile.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
