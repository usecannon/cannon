import { GuidesPage } from '@/features/Guides/GuidesPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Guides',
};

export default function Home() {
  return <GuidesPage />;
}
