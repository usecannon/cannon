import { useRouter } from 'next/router';
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
          url: 'https://usecannon.com/images/og_image.png',
        },
      ],
    },
  };
  return metadata;
}

export default function Overview() {
  const { name, tag, chainId, preset } = usePackageNameTagVariantUrlParams();

  return (
    <>
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
