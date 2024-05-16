//import { Metadata } from 'next';
import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/router';
import { links } from '@/constants/links';

import Layout from '../_layout';
import NestedLayout from './_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Guides',
  description: 'Guides',
  openGraph: {
    title: 'Cannon | Guides',
    description: 'Guides',
  },
  };*/

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router
      .push(links.GETSTARTED)
      .then(() => {
        // do nothing
      })
      .catch(() => {
        // do nothing
      });
  }, []);
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
