import defaultSEO from '@/constants/defaultSeo';
import dynamic from 'next/dynamic';
import { ReactElement } from 'react';
import DeployLayout from '@/pages/deploy/deployLayout';

const NoSSR = dynamic(() => import('@/features/Deploy/SignTransactionsPage'), {
  ssr: false,
});

export default function SignTransactions() {
  return (
    <>
      <NoSSR />
    </>
  );
}

SignTransactions.getLayout = function getLayout(page: ReactElement) {
  return <DeployLayout>{page}</DeployLayout>;
};
