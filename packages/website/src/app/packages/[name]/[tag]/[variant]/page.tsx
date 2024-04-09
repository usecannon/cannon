import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/DeploymentTab');
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
    title: `Cannon | ${params.name} | ${params.tag} | ${params.variant}`,
    description: 'Package',
    openGraph: {
      title: `Cannon | ${params.name} | ${params.tag} | ${params.variant}`,
      description: 'Package',
      url: 'https://usecannon.com',
      siteName: 'Cannon',
      locale: 'en_US',
      type: 'website',
    },
  };
  return metadata;
}

export default function Deployment({
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
