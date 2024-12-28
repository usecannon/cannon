import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import DeployLayout from '@/pages/deploy/deployLayout';
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
  return <DeployLayout>{page}</DeployLayout>;
};
