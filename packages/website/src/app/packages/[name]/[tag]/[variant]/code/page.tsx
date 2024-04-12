import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CodeTab');
  },
  {
    ssr: false,
  }
);
export const metadata: Metadata = {
  title: 'Cannon | Package | Code',
  description: 'Package | Code',
  openGraph: {
    title: 'Cannon | Package',
    description: 'Package',
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

export default function Code({
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
