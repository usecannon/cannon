import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import Layout from '../_layout';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const NoSSR = dynamic(
  async () => {
    return import('@/features/Deploy/QueueFromGitOpsPage');
  },
  {
    ssr: false,
  }
);

/*export const metadata: Metadata = {
  title: 'Cannon | Queue From GitOps',
  description: 'Queue From GitOps',
  openGraph: {
    title: 'Cannon | Queue From GitOps',
    description: 'Queue From GitOps',
  },
  };*/

export default function QueueFromGitOps() {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Queue From GitOps"
        description="Queue From GitOps"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Queue From GitOps',
          description: 'Queue From GitOps',
        }}
      />
      <NoSSR />
    </>
  );
}
QueueFromGitOps.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};
