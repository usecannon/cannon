import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import chains from '@/helpers/chains';
import { find } from 'lodash';
import { ChainData } from '@/features/Search/PackageCard/Chain';
import { PackageReference } from '@usecannon/builder';

import Layout from './_layout';
import { ReactElement } from 'react';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/DeploymentTab');
  },
  {
    ssr: false,
  }
);

function generateMetadata({
  params,
}: {
  params: { name: string; tag: string; variant: string };
}) {
  const [chainId, preset] = PackageReference.parseVariant(params.variant);
  const chain: { name: string; id: number } =
    Number(chainId) == 13370
      ? { id: 13370, name: 'Cannon' }
      : (find(chains, (chain: ChainData) => chain.id === Number(chainId)) as {
          name: string;
          id: number;
        });

  const title = `${params.name} on ${chain ? chain.name : 'chain'} | Cannon`;

  const description = `Explore the Cannon package for ${params.name}${
    params.tag !== 'latest' ? `:${params.tag}` : ''
  }${preset !== 'main' ? `@${preset}` : ''} on ${
    chain ? chain.name : 'chain'
  } (ID: ${chainId})`;

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
  const metadata = generateMetadata({ params: params as any });
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
      <NoSSR
        name={decodeURIComponent(params.name as string)}
        tag={decodeURIComponent(params.tag as string)}
        variant={decodeURIComponent(params.variant as string)}
      />
    </>
  );
}

Deployment.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
