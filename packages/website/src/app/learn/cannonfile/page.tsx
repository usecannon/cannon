import { DocsCannonfilesPage } from '@/features/Docs/DocsCannonfilesPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | Cannonfile Docs',
  description: 'Cannonfile Docs',
  openGraph: {
    title: 'Cannon | Cannonfile Docs',
    description: 'Cannonfile Docs',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default function Docs() {
  return <DocsCannonfilesPage />;
}
