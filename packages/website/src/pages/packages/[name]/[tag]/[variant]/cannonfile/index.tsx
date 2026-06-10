import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import NameTagVariantLayout from '../NameTagVariantLayout';
import { ReactElement } from 'react';
import { PackageReference } from '@usecannon/builder';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

function generateMetadata({
  params,
  getChainById,
}: {
  params: { name: string; tag: string; variant: string };
  getChainById: ReturnType<typeof useCannonChains>['getChainById'];
}) {
  const [chainId, preset] = PackageReference.parseVariant(params.variant);
  const chain = getChainById(chainId);

  const title = `${params.name} on ${chain?.name} Cannonfile | Cannon`;

  const description = `Cannon file for package ${params.name}${
    params.tag !== 'latest' ? `:${params.tag}` : ''
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

const DynamicCannonfileTab = dynamic(
  async () => {
    return import('@/features/Packages/Tabs/CannonfileTab');
  },
  {
    ssr: false,
  }
);

export default function Cannonfile() {
  const params = useRouter().query;

  return (
    <>
      <DynamicCannonfileTab
        name={decodeURIComponent(params.name as string)}
        tag={decodeURIComponent(params.tag as string)}
        variant={decodeURIComponent(params.variant as string)}
      />
    </>
  );
}

Cannonfile.getLayout = function getLayout(page: ReactElement) {
  return <NameTagVariantLayout>{page}</NameTagVariantLayout>;
};
