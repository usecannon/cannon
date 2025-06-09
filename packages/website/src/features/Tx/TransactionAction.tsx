import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { Chain } from '@/types/Chain';
import { ExtendedTransactionMethod } from '@/types/TransactionMethod';
import { isTxHash } from '@/helpers/transaction';
import OtherEvent from '@/features/Tx/action/OtherEvent';
import TransferEvent from '@/features/Tx/action/TransferEvent';

type TransactionActionProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: Chain;
  txNames: ExtendedTransactionMethod;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

function isTransferAction(
  logs: any,
  txNames: ExtendedTransactionMethod,
  input: string
): boolean {
  //0. input = 0x
  if (logs.length < 1) {
    return input === '0x';
  }

  const topic = logs[logs.length - 1].topics[0];
  const selector = topic.slice(0, 10);
  const method = txNames?.[selector];

  if (Array.isArray(method)) {
    const topics = logs[logs.length - 1].topics;
    //1. the number of argas on the topic is over 3
    const isTxLength = topics.length >= 3;

    //2. topic 1 and 2 start with 0x and 32 bytes
    const isHex = isTxLength && isTxHash(topics[1]) && isTxHash(topics[2]);

    //3. function name includes transfer
    const hasTransfer = method.some((tx) =>
      tx.name.toLowerCase().includes('transfer')
    );
    //1, 2 and 3 --> transfer
    return isTxLength && isHex && hasTransfer;
  }

  return false;
}

const TransactionAction: React.FC<TransactionActionProps> = ({
  tx,
  txReceipt,
  chain,
  txNames,
  hoverId,
  setHoverId,
}) => {
  const toAddress = tx.to ?? txReceipt?.contractAddress ?? '';

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
          {isTransferAction(txReceipt.logs, txNames, tx.input) ? (
            <TransferEvent
              fromAddress={tx.from}
              toAddress={toAddress}
              hoverId={hoverId}
              setHoverId={setHoverId}
            />
          ) : (
            <OtherEvent
              tx={tx}
              txReceipt={txReceipt}
              hoverId={hoverId}
              setHoverId={setHoverId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionAction;
