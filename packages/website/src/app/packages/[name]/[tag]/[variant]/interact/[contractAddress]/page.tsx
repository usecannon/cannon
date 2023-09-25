import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/InteractPage');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Interact({
  params,
}: {
  params: { contractAddress: string };
}) {
  return <NoSSR contractAddress={params.contractAddress} />;
}
