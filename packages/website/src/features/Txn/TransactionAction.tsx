import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType, isHash } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { Chain } from '@/types/Chain';
import { TransactionMethod } from '@/types/TransactionMethod';
import InfoTooltip from '@/features/Txn/InfoTooltip';
import DetailBadge from '@/features/Txn/detail/DetailBadge';

type TransactionActionProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: Chain;
  txNames: Record<string, TransactionMethod[]> | undefined;
};

export const isTxHash = (hash: string): boolean => {
  // Check for exact 66-character length (including '0x' prefix)
  const is66CharHex = /^0x[a-fA-F0-9]{64}$/.test(hash);

  return is66CharHex && isHash(hash);
};

function isTransferAction(
  logs: any,
  txNames: Record<string, TransactionMethod[]> | undefined,
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
    // console.log(
    //   `isLength : ${isTxLength}, isHex : ${isHex}, hasTransfer : ${hasTransfer}`
    // );
    return isTxLength && isHex && hasTransfer;
  }

  return false;
}

const TransactionAction: React.FC<TransactionActionProps> = ({
  tx,
  txReceipt,
  chain,
  txNames,
}) => {
  const RrenderTxEvent = () => {
    // const topic =
    //   txReceipt.logs.length > 0
    //     ? txReceipt.logs[txReceipt.logs.length - 1].topics[0]
    //     : null;
    // const selector = topic && topic.slice(0, 10);
    // const method = selector && txNames?.[selector];
    const input = tx.input.slice(0, 10);

    return (
      <>
        <div className="flex flex-wrap items-center break-all">
          <span className="text-gray-400 text-sm mr-1">Call</span>
          <DetailBadge value={input} />
          <span className="text-gray-400 text-sm ml-1 mr-1">Method by</span>
          <InfoTooltip
            trigger={
              <span className="text-base mr-1 ml-1 break-all">{`${tx.from.substring(
                0,
                8
              )}...${tx.from.slice(-6)}`}</span>
            }
          >
            {tx.from}
          </InfoTooltip>
          {/* If contactAddress is null --> add "on to" */}
          {!txReceipt.contractAddress && tx.to != null && (
            <>
              <span className="text-gray-400 text-sm ml-1 mr-1">on</span>
              <InfoTooltip
                trigger={
                  <span className="text-base mr-1 ml-1 break-all">{`${tx.to.substring(
                    0,
                    8
                  )}...${tx.from.slice(-6)}`}</span>
                }
              >
                {tx.to}
              </InfoTooltip>
            </>
          )}
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (!isTransferAction(txReceipt.logs, txNames, tx.input)) {
      return RrenderTxEvent();
    } else {
      return (
        <>
          <div className="flex flex-wrap items-center break-all">
            <span className="text-gray-400 text-sm mr-1">
              Transfer Ownership from
            </span>
            <InfoTooltip
              trigger={
                <span className="text-base mr-1 break-all">{`${tx.from.substring(
                  0,
                  8
                )}...${tx.from.slice(-6)}`}</span>
              }
            >
              {tx.from}
            </InfoTooltip>
            <span className="text-gray-400 text-sm mr-1">to</span>
            <InfoTooltip
              trigger={
                <span className="text-base break-all">
                  {tx.to
                    ? `${tx.to.substring(0, 8)}...${tx.to.slice(-6)}`
                    : txReceipt?.contractAddress
                    ? `${txReceipt?.contractAddress.substring(
                        0,
                        8
                      )}...${txReceipt?.contractAddress.slice(-6)}`
                    : ''}
                </span>
              }
            >
              {tx.to ? tx.to : txReceipt?.contractAddress}
            </InfoTooltip>
          </div>
        </>
      );
    }
  };

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
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionAction;
