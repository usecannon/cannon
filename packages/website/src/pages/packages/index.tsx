import { SearchPage } from '@/features/Search/SearchPage';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

export default function Home() {
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
      <SearchPage />
    </>
  );
}
