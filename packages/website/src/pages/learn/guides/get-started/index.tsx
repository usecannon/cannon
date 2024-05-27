import { GetStartedPage } from '@/features/GetStarted/GetStartedPage';
//import { Metadata } from 'next';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Get Started',
  description: 'Get Started',
  openGraph: {
    title: 'Cannon | Get Started',
    description: 'Get Started',
  },
  };*/

export default function Home() {
  return <GetStartedPage />;
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
