import { ReactElement } from 'react';
import DeployLayout from '@/pages/deploy/deployLayout';
import { QueuedTxns } from '@/features/Deploy/QueueDrawer';
import defaultSEO from '@/constants/defaultSeo';

const QueueTransactions = () => {
  return (
    <>
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
