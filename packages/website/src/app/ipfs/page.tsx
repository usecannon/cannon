import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(() => import('@/features/Ipfs/Download'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Cannon | IPFS Download',
  description: 'IPFS Download',
  openGraph: {
    title: 'Cannon | IPFS Download',
    description: 'IPFS Download',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default function IpfsDownload() {
  return <NoSSR />;
}
