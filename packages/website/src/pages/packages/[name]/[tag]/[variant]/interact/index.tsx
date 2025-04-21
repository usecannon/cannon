import { ReactElement } from 'react';
import NameTagVariantLayout from '../NameTagVariantLayout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import InteractComponent from '@/features/Packages/interact/Interact';

function generateMetadata({
  name,
  tag,
  chainId,
  preset,
  getChainById,
}: {
  name: string;
  tag: string;
  chainId: number;
  preset: string;
  getChainById: ReturnType<typeof useCannonChains>['getChainById'];
}) {
  const chain = getChainById(chainId);

  const title = `${name} on ${chain?.name} Interact | Cannon`;

  const description = `Explore the Cannon package for ${name}${
    tag !== 'latest' ? `:${tag}` : ''
  }${preset !== 'main' ? `@${preset}` : ''} on ${chain?.name} (ID: ${
    chain?.id
  })`;

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
  const { name, tag, chainId, preset } = usePackageNameTagVersionUrlParams();
  const { getChainById } = useCannonChains();
  const metadata = generateMetadata({
    name,
    tag,
    chainId,
    preset,
    getChainById,
  });

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
      <InteractComponent />
    </>
  );
}

Interact.getLayout = function getLayout(page: ReactElement) {
  return <NameTagVariantLayout>{page}</NameTagVariantLayout>;
};
