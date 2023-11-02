import { DocsCliPage } from '@/features/Docs/DocsCliPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannon | CLI Docs',
};

export default function Docs() {
  return <DocsCliPage />;
}
