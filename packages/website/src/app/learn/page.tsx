import { Metadata } from 'next';
import { DocsLandingPage } from '@/features/Docs/DocsLandingPage';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
  description: 'Docs',
  openGraph: {
    title: 'Cannon | Docs',
    description: 'Docs',
  },
};

export default function Docs() {
  return <DocsLandingPage />;
}
