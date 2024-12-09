import { AllPackages } from '@/features/Search/AllPackages';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function AllPackagesPage() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Explore Packages"
        description="Explore Packages"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Explore Packages',
          description: 'Explore Packages',
        }}
      />
      <AllPackages />
    </>
  );
}
