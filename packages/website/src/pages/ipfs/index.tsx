import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(() => import('@/features/Ipfs/Download'), {
  ssr: false,
});

export default function IpfsDownload() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | IPFS Download"
        description="IPFS Download"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | IPFS Download',
          description: 'IPFS Download',
        }}
      />
      <NoSSR />
    </>
  );
}
