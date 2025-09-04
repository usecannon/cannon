import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';
import EventLog from '@/features/Tx/log/EventLog';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { ExtendedTransactionMethod } from '@/types/TransactionMethod';

type TransactionEventLogProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txNames: ExtendedTransactionMethod;
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
          {txReceipt.logs.map((log: any, index) => {
            return (
              <EventLog
                tx={tx}
                log={log}
                functionNames={txNames[log.topics[0].slice(0, 10)]}
                key={index}
                hoverId={hoverId}
                setHoverId={setHoverId}
              />
            );
          })}
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionEventLog;
