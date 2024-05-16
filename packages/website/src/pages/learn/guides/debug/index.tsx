import { DebugPage } from '@/features/Debug/DebugPage';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../_layout';
//import { Metadata } from 'next';

/*export const metadata: Metadata = {
  title: 'Cannon | Debugging Tips',
  description: 'Debugging Tips',
  openGraph: {
    title: 'Cannon | Debugging Tips',
    description: 'Debugging Tips',
  },
  };*/

export default function Home() {
  return <DebugPage />;
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
