import { Metadata } from 'next';
import { DocsLandingPage } from '@/features/Docs/DocsLandingPage';

export const metadata: Metadata = {
  title: 'Cannon | Docs',
};

export default function Docs() {
  return <DocsLandingPage />;
}
