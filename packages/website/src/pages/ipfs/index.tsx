import dynamic from 'next/dynamic';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(() => import('@/features/Ipfs/Download'), {
  ssr: false,
});

export default function IpfsDownload() {
  return (
    <>
      <NoSSR />
    </>
  );
}
