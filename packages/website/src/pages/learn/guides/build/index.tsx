import { BuildPage } from '@/features/GetStarted/BuildPage';
import { ReactElement } from 'react';
import Layout from '../../_layout';
import NestedLayout from '../guideLayout';

export default function Home() {
  return (
    <>
      <BuildPage />
    </>
  );
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
