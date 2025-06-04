import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';
import EventLog from '@/features/Txn/log/EventLog';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';

type TransactionEventLogProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txNames: any;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

const TransactionEventLog: React.FC<TransactionEventLogProps> = ({
  tx,
  txReceipt,
  txNames,
  hoverId,
  setHoverId,
}) => {
  return (
    <>
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="mt-4">
          <h2>Transaction Receipt Event Logs</h2>
          {txReceipt.logs.map((log: any, key) => (
            <EventLog
              tx={tx}
              log={log}
              txNames={txNames[log.topics[0].slice(0, 10)]}
              key={key}
              hoverId={hoverId}
              setHoverId={setHoverId}
            />
          ))}
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionEventLog;
