import { RouterPage } from '@/features/Router/RouterPage';
//import { Metadata } from 'next';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Synthetix Router',
  description: 'Synthetix Router',
  openGraph: {
    title: 'Cannon | Synthetix Router',
    description: 'Synthetix Router',
  },
  };*/

export default function Home() {
  return <RouterPage />;
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
