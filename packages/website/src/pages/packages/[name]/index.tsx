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
        title={`Cannon | Package | ${params.name}`}
        description={`Cannon | Package | ${params.name}`}
        openGraph={{
          ...defaultSEO.openGraph,
          title: `Cannon | Package | ${params.name}`,
          description: `Cannon | Package | ${params.name}`,
        }}
      />
      <NoSSR name={params.name as string} />
    </>
  );
}
