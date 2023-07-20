import { Metadata } from 'next';
import { SearchPage } from '@/features/Search/SearchPage';

export const metadata: Metadata = {
  title: 'Cannon | Explore Packages',
  description: 'explore registered packages',
};
export default function Home() {
  return <SearchPage />;
}
