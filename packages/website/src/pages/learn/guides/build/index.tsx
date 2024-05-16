import { BuildPage } from '@/features/GetStarted/BuildPage';
//import { Metadata } from 'next';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Build',
  description: 'Build',
  openGraph: {
    title: 'Cannon | Build',
    description: 'Build',
  },
  };*/

export default function Home() {
  return <BuildPage />;
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
