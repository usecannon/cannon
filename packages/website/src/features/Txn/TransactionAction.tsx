import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';
import { formatEther, GetTransactionReturnType } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';

type TransactionActionProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: ReturnType<ReturnType<typeof useCannonChains>['getChainById']>;
};

const TransactionAction: React.FC<TransactionActionProps> = ({
  tx,
  txReceipt,
  chain,
}) => {
  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>TRANSACTION ACTION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            <span className="mr-2">{chain?.name}</span>
            <span className="text-gray-400 text-sm mr-2">{`(ID: ${chain?.id})`}</span>
          </div>
          <div className="flex items-center break-all">
            <span className="text-gray-400 text-sm mr-1">Transfer</span>
            <span className="text-base mr-1">
              {`${String(formatEther(tx?.value))} ${
                chain?.nativeCurrency?.symbol
              }`}
            </span>
            <span className="text-gray-400 text-sm mr-1">to</span>
            <span className="text-base">
              {tx.to ? tx.to : txReceipt?.contractAddress}
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionAction;
