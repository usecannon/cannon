import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/PackagePage');
  },
  {
    ssr: false,
  }
);

export async function generateMetadata({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  const metadata: Metadata = {
    title: `Cannon | ${params.name}`,
    description: 'Package',
    openGraph: {
      title: `Cannon | ${params.name}`,
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
  return metadata;
}

export default function Deployment({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  return <NoSSR name={params.name} />;
}
