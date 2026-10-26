import { ReactElement } from 'react';
import { useParams } from 'next/navigation';

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
      <Interact />
    </>
  );
}

InteractPage.getLayout = function getLayout(page: ReactElement) {
  return <NameTagVariantLayout>{page}</NameTagVariantLayout>;
};
