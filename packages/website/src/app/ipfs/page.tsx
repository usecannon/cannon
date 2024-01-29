import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(() => import('@/features/Ipfs/Download'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Cannon | IPFS Download',
};

export default function IpfsDownload() {
  return <NoSSR />;
}
