import { DocsCliPage } from '@/features/Docs/DocsCliPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | CLI Docs',
  description: 'CLI Docs',
  openGraph: {
    title: 'Cannon | CLI Docs',
    description: 'CLI Docs',
  },
};

export default function Docs() {
  return <DocsCliPage />;
}
