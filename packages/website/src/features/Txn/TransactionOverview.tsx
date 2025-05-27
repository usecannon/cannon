import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import SummaryInfo from '@/features/Txn/overview/SummaryInfo';
import AddressInfo from '@/features/Txn/overview/AddressInfo';
import CostInfo from '@/features/Txn/overview/CostInfo';
import { Chain } from '@/types/Chain';

type TransactionOverviewProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txBlock: GetBlockReturnType;
  chain: Chain;
  getExplorerUrl: ReturnType<typeof useCannonChains>['getExplorerUrl'];
};

const TransactionOverview: React.FC<TransactionOverviewProps> = ({
  tx,
  txReceipt,
  txBlock,
  chain,
  getExplorerUrl,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {/* Display Summary Information */}
            <SummaryInfo tx={tx} txReceipt={txReceipt} txBlock={txBlock} />
            <hr className="opacity-75" />

            {/* Display Address Information */}
            <AddressInfo
              tx={tx}
              txReceipt={txReceipt}
              getExplorerUrl={getExplorerUrl}
            />
            <hr className="opacity-75" />

            {/* Display Cost Information */}
            <CostInfo tx={tx} txReceipt={txReceipt} chain={chain} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionOverview;
