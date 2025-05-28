import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
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
  latestBlockNumber: bigint;
};

const TransactionOverview: React.FC<TransactionOverviewProps> = ({
  tx,
  txReceipt,
  txBlock,
  chain,
  latestBlockNumber,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {/* Display Summary Information */}
            <SummaryInfo
              tx={tx}
              txReceipt={txReceipt}
              timestamp={txBlock.timestamp}
              latestBlockNumber={latestBlockNumber}
            />
            <hr className="opacity-75" />

            {/* Display Address Information */}
            <AddressInfo chainId={tx.chainId} txReceipt={txReceipt} />
            <hr className="opacity-75" />

            {/* Display Cost Information */}
            <CostInfo
              tx={tx}
              txReceipt={txReceipt}
              symbol={chain?.nativeCurrency.symbol || 'ETH'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionOverview;
