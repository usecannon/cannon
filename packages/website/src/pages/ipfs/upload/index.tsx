//import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Ipfs/Upload');
  },
  {
    ssr: false,
  }
);

/*export const metadata: Metadata = {
  title: 'Cannon | IPFS Upload',
  description: 'IPFS Upload',
  openGraph: {
    title: 'Cannon | IPFS Upload',
    description: 'IPFS Upload',
  },
  };*/

export default function IpfsUpload() {
  return <NoSSR />;
}
