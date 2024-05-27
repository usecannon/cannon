//import { Metadata } from 'next';
import { ReactElement } from 'react';

import Layout from '../_layout';
import NestedLayout from './_layout';

/*export const metadata: Metadata = {
  title: 'Cannon | Package',
  description: 'Package',
  openGraph: {
    title: 'Cannon | Package',
    description: 'Package',
    url: 'https://usecannon.com',
    siteName: 'Cannon',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://usecannon.com/images/og.png',
      },
    ],
  },
  };*/

export default function Interact() {
  return <></>;
}
Interact.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      <NestedLayout>{page}</NestedLayout>
    </Layout>
  );
};
