import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import DeployLayout from '@/pages/deploy/deployLayout';
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
      <NoSSR />
    </>
  );
}
QueueFromGitOps.getLayout = function getLayout(page: ReactElement) {
  return <DeployLayout>{page}</DeployLayout>;
};
