import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CannonfileTab');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
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
};

export default function Cannonfile({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  return (
    <NoSSR
      name={decodeURIComponent(params.name)}
      tag={decodeURIComponent(params.tag)}
      variant={decodeURIComponent(params.variant)}
    />
  );
}
