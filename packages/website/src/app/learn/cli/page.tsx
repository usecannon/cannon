import { DocsCliPage } from '@/features/Docs/DocsCliPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | CLI Docs',
  description: 'CLI Docs',
  openGraph: {
    title: 'Cannon | CLI Docs',
    description: 'CLI Docs',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
  },
};

export default function Docs() {
  return <DocsCliPage />;
}
