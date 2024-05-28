import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ReactElement } from 'react';
import Layout from '../_layout';
import NestedLayout from './_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { PackageReference } from '@usecannon/builder';
import { ChainData } from '@/features/Search/PackageCard/Chain';
import chains from '@/helpers/chains';
import { find } from 'lodash';

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

  const title = `${params.name} on ${chain.name} | Cannon`;

  const description = `Explore the Cannon package code for ${params.name}${
    params.tag !== 'latest' ? `:${params.tag}` : ''
  }${preset !== 'main' ? `@${preset}` : ''} on ${chain.name} (ID: ${chain.id})`;

  const metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
  return metadata;
}

const NoSSR = dynamic(() => import('@/features/Packages/CodePage'), {
  ssr: false,
});

export default function Code() {
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
Code.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
