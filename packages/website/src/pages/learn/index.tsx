//import { Metadata } from 'next';
import { DocsLandingPage } from '@/features/Docs/DocsLandingPage';
import { ReactElement } from 'react';
import Layout from './_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Docs',
  description: 'Docs',
  openGraph: {
    title: 'Cannon | Docs',
    description: 'Docs',
  },
  };*/

export default function Docs() {
  return <DocsLandingPage />;
}
Docs.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
