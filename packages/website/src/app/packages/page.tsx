import { Metadata } from 'next';
import { SearchPage } from '@/features/Search/SearchPage';

export const metadata: Metadata = {
  title: 'Cannon | Explore Packages',
  openGraph: {
    title: 'Cannon | Explore Packages',
    description: 'Explore Packages',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};
export default function Home() {
  return <SearchPage />;
}
