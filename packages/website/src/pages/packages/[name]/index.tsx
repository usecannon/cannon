import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Packages/PackagePage');
  },
  {
    ssr: false,
  }
);

export default function Deployment() {
  const params = useRouter().query;
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title={`Cannon | ${params.name}`}
        description="Package"
        openGraph={{
          ...defaultSEO.openGraph,
          title: `Cannon | ${params.name}`,
          description: 'Package',
        }}
      />
      <NoSSR name={params.name as string} />
    </>
  );
}
