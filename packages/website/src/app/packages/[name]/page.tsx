import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/PackagesPage');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
};

export default function Package({ params }: { params: { name: string } }) {
  return <NoSSR name={params.name} />;
  // return <PackagesPage name={params.name} />;
}
