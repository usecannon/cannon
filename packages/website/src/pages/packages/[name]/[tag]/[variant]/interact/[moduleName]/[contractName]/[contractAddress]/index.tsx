import { ReactElement } from 'react';
import { NextSeo } from 'next-seo';
import { useParams } from 'next/navigation';

import defaultSEO from '@/constants/defaultSeo';
import PageLoading from '@/components/PageLoading';
import Interact from '@/features/Packages/interact/Interact';
import NameTagVariantLayout from '@/pages/packages/[name]/[tag]/[variant]/NameTagVariantLayout';
import { PackageReference } from '@usecannon/builder';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

export default function InteractPage() {
  const params = useParams();
  const { getChainById } = useCannonChains();

  if (!params) return <PageLoading />;

  const [chainId] = PackageReference.parseVariant(params.variant as string);
  const chain = getChainById(chainId);

  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={`${params.name} on ${chain?.name} Interact | Cannon`}
        description="Package | Interact"
        openGraph={{
          ...defaultSEO.openGraph,
          title: `${params.name} on ${chain?.name} Interact | Cannon`,
          description: 'Package | Interact',
        }}
      />
      <Interact />
    </>
  );
}

InteractPage.getLayout = function getLayout(page: ReactElement) {
  return <NameTagVariantLayout>{page}</NameTagVariantLayout>;
};
