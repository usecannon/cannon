import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import EventLog from '@/features/Txn/EventLog';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';

type TransactionEventLogProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  getExplorerUrl: ReturnType<typeof useCannonChains>['getExplorerUrl'];
};

const TransactionEventLog: React.FC<TransactionEventLogProps> = ({
  tx,
  txReceipt,
  getExplorerUrl,
}) => {
  return (
    <>
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="mt-4">
          <h2>Transaction Receipt Event Logs</h2>
          {txReceipt.logs.map((log: any) => (
            <EventLog tx={tx} log={log} getExplorerUrl={getExplorerUrl} />
          ))}
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionEventLog;
