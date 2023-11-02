import { DocsCannonfilesPage } from '@/features/Docs/DocsCannonfilesPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Cannonfile Docs',
};

export default function Docs() {
  return <DocsCannonfilesPage />;
}
