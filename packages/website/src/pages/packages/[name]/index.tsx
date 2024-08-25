import dynamic from 'next/dynamic';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';
import { usePackageUrlParams } from '@/hooks/routing/usePackageUrlParams';

const NoSSRPackagePage = dynamic(
  async () => {
    return import('@/features/Packages/PackagePage');
  },
  {
    ssr: false,
  }
);

export default function Deployment() {
  const { name } = usePackageUrlParams();
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={`Cannon | Package | ${name}`}
        description={`Cannon | Package | ${name}`}
        openGraph={{
          ...defaultSEO.openGraph,
          title: `Cannon | Package | ${name}`,
          description: `Cannon | Package | ${name}`,
        }}
      />
      <NoSSRPackagePage name={name} />
    </>
  );
}
