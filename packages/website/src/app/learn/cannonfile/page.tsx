import { DocsCannonfilesPage } from '@/features/Docs/DocsCannonfilesPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Cannonfile Docs',
  description: 'Cannonfile Docs',
  openGraph: {
    title: 'Cannon | Cannonfile Docs',
    description: 'Cannonfile Docs',
  },
};

export default function Docs() {
  return <DocsCannonfilesPage />;
}
