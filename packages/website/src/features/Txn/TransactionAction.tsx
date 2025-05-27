import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';
import { formatEther, GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { Chain } from '@/types/Chain';

type TransactionActionProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: Chain;
};

const TransactionAction: React.FC<TransactionActionProps> = ({
  tx,
  txReceipt,
  chain,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>TRANSACTION ACTION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center">
            <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            <span className="mr-2">{chain?.name}</span>
            <span className="text-gray-400 text-sm mr-2">{`(ID: ${chain?.id})`}</span>
          </div>
          <div className="flex flex-wrap items-center break-all">
            <span className="text-gray-400 text-sm mr-1">Transfer</span>
            <span className="text-base mr-1 break-all">
              {`${String(formatEther(tx?.value))} ${
                chain?.nativeCurrency?.symbol
              }`}
            </span>
            <span className="text-gray-400 text-sm mr-1">to</span>
            <span className="text-base break-all">
              {tx.to ? tx.to : txReceipt?.contractAddress}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionAction;
