import { DocsCannonfilesPage } from '@/features/Docs/DocsCannonfilesPage';
import { ReactElement } from 'react';
import Layout from '../_layout';
//import { Metadata } from 'next';

/*export const metadata: Metadata = {
  title: 'Cannon | Cannonfile Docs',
  description: 'Cannonfile Docs',
  openGraph: {
    title: 'Cannon | Cannonfile Docs',
    description: 'Cannonfile Docs',
  },
  };*/

export default function Docs() {
  return <DocsCannonfilesPage />;
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
