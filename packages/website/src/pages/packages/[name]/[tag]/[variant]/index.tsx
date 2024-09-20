import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { PackageReference } from '@usecannon/builder';

import TagVariantLayout from './_layout';
import { ReactElement } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

const DeploymentTab = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/DeploymentTab');
  },
  {
    ssr: false,
  }
);

function generateMetadata({
  params,
  getChainById,
}: {
  params: { name: string; tag: string; variant: string };
  getChainById: ReturnType<typeof useCannonChains>['getChainById'];
}) {
  const [chainId, preset] = PackageReference.parseVariant(params.variant);
  const chain = getChainById(chainId);

  const title = `${params.name} on ${chain?.name} | Cannon`;

  const description = `Explore the Cannon package for ${params.name}${
    params.tag !== 'latest' ? `:${params.tag}` : ''
  }${preset !== 'main' ? `@${preset}` : ''} on ${chain?.name} (ID: ${chainId})`;

  const metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
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

export default function Deployment() {
  const params = useRouter().query;
  const { getChainById } = useCannonChains();
  const metadata = generateMetadata({ params: params as any, getChainById });
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={metadata.title}
        description={metadata.description}
        openGraph={{
          ...defaultSEO.openGraph,
          title: metadata.title,
          description: metadata.description,
        }}
      />
      <DeploymentTab
        name={decodeURIComponent(params.name as string)}
        tag={decodeURIComponent(params.tag as string)}
        variant={decodeURIComponent(params.variant as string)}
      />
    </>
  );
}

Deployment.getLayout = function getLayout(page: ReactElement) {
  return <TagVariantLayout>{page}</TagVariantLayout>;
};
