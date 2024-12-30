import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { PackageReference } from '@usecannon/builder';

import TagVariantLayout from './NameTagVariantLayout';
import { ReactElement } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import PackageAccordionHelper from '@/features/Packages/PackageAccordionHelper';
import { usePackageNameTagVariantUrlParams } from '@/hooks/routing/usePackageNameTagVariantUrlParams';

function generateMetadata({
  params,
  getChainById,
}: {
  params: { name: string; tag: string; variant: string };
  getChainById: ReturnType<typeof useCannonChains>['getChainById'];
}) {
  const [chainId, preset] = PackageReference.parseVariant(params.variant);
  const chain = getChainById(chainId);

  const title = `${params.name} on ${chain?.name} Deployment Overview | Cannon`;

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

export default function Overview() {
  const { query: params } = useRouter();
  const { getChainById } = useCannonChains();
  const metadata = generateMetadata({ params: params as any, getChainById });

  const { name, tag, chainId, preset } = usePackageNameTagVariantUrlParams();

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
      <PackageAccordionHelper
        name={name}
        tag={tag}
        chainId={chainId}
        preset={preset}
      />
    </>
  );
}

Overview.getLayout = function getLayout(page: ReactElement) {
  return <TagVariantLayout>{page}</TagVariantLayout>;
};
