import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Ipfs/History');
  },
  {
    ssr: false,
  }
);

export const metadata: Metadata = {
  title: 'Cannon | IPFS History',
};

export default function IpfsHistory() {
  return <NoSSR />;
}
