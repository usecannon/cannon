import { ReactElement } from 'react';
import TagVariantLayout from '../_layout';
import InteractLayout from './_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { getChainById } from '@/helpers/chains';
import { usePackageUrlParams } from '@/hooks/routing/usePackageUrlParams';

function generateMetadata({
  name,
  tag,
  chainId,
  preset,
}: {
  name: string;
  tag: string;
  chainId: number;
  preset: string;
}) {
  const chain = getChainById(chainId);

  const title = `${name} on ${chain ? chain.name : 'Unknown Chain'} | Cannon`;

  const description = `Explore the Cannon package for ${name}${
    tag !== 'latest' ? `:${tag}` : ''
  }${preset !== 'main' ? `@${preset}` : ''} on ${
    chain ? chain.name : 'Unknown Chain'
  } (ID: ${chain ? chain.id : chainId})`;

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

export default function Interact() {
  const { name, tag, chainId, preset } = usePackageUrlParams();
  const metadata = generateMetadata({
    name,
    tag,
    chainId,
    preset,
  });

  return (
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
  );
}

Interact.getLayout = function getLayout(page: ReactElement) {
  return (
    <TagVariantLayout>
      <InteractLayout>{page}</InteractLayout>
    </TagVariantLayout>
  );
};
