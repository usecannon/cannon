import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Ipfs/Upload');
  },
  {
    ssr: false,
  }
);

export default function IpfsUpload() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | IPFS Upload"
        description="IPFS Upload"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | IPFS Upload',
          description: 'IPFS Upload',
        }}
      />
      <NoSSR />
    </>
  );
}
