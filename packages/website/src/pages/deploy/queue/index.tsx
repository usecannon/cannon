import { ReactElement } from 'react';
import DeployLayout from '@/pages/deploy/deployLayout';
import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import { NextSeo } from 'next-seo';
import defaultSEO from '@/constants/defaultSeo';

const QueueTransactions = () => {
  return (
    <>
      <NextSeo
        {...defaultSEO}
        title="Cannon | Queue Transactions"
        description="Queue Transactions"
        openGraph={{
          ...defaultSEO.openGraph,
          title: 'Cannon | Queue Transactions',
          description: 'Queue Transactions',
        }}
      />
      <div className="container max-w-3xl py-8">
        <QueuedTxns />
      </div>
    </>
  );
};

QueueTransactions.getLayout = function getLayout(page: ReactElement) {
  return <DeployLayout>{page}</DeployLayout>;
};

export default QueueTransactions;
