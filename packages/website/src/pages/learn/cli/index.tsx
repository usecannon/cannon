import { DocsCliPage } from '@/features/Docs/DocsCliPage';
import { ReactElement } from 'react';
import Layout from '../_layout';
//import { Metadata } from 'next';

/*export const metadata: Metadata = {
  title: 'Cannon | CLI Docs',
  description: 'CLI Docs',
  openGraph: {
    title: 'Cannon | CLI Docs',
    description: 'CLI Docs',
  },
  };*/

export default function Docs() {
  return <DocsCliPage />;
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
