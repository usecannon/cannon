import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import TagVariantLayout from '../NameTagVariantLayout';
import { ReactElement, useEffect } from 'react';
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

  const title = `${params.name} on ${chain?.name} Deployment Data | Cannon`;

  const description = `Explore the Cannon package deployment data for ${
    params.name
  }${params.tag !== 'latest' ? `:${params.tag}` : ''}${
    preset !== 'main' ? `@${preset}` : ''
  } on ${chain?.name} (ID: ${chainId})`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default function Deployment() {
  const router = useRouter();
  const params = router.query;
  const { getChainById } = useCannonChains();
  const metadata = generateMetadata({ params: params as any, getChainById });

  // Redirect to contracts tab
  useEffect(() => {
    if (router.isReady) {
      void router.replace(
        `/packages/${params.name}/${params.tag}/${params.variant}/deployment/contracts`
      );
    }
  }, [router.isReady, params.name, params.tag, params.variant]);

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
    </>
  );
}

Deployment.getLayout = function getLayout(page: ReactElement) {
  return <TagVariantLayout>{page}</TagVariantLayout>;
};
