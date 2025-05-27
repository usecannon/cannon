import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Clock5 } from 'lucide-react';
import StatusBadge from '@/features/Txn/overview/StatusBadge';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { getDifferentDays, formatUTCDate } from '@/lib/transaction';

type SummaryInfoProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txBlock: GetBlockReturnType;
};

const SummaryInfo: React.FC<SummaryInfoProps> = ({
  tx,
  txReceipt,
  txBlock,
}) => {
  return (
    <>
      <TxInfoRow
        label="Transaction Hash:"
        description="A TxHash or transaction hash is a unique 66-character
                    identifier that is generated whenever a transaction is
                    executed."
      >
        <span className="break-all">{tx.hash}</span>
        <ClipboardButton text={tx.hash} />
      </TxInfoRow>
      <TxInfoRow label="Status:" description="The status of the transaction.">
        <StatusBadge status={txReceipt.status} />
      </TxInfoRow>
      <TxInfoRow
        label="Block:"
        description="Number of the block in which the transaction is recorded.
                    Block confirmations indicate how many blocks have been added
                    since the transaction was produced."
      >
        <span>{tx.blockNumber.toLocaleString()}</span>
      </TxInfoRow>
      <TxInfoRow
        label="Timestamp:"
        description="The date and time at which a transaction is produced."
      >
        <Clock5 className="w-4 h-4 text-gray-400" />
        <span>{getDifferentDays(txBlock.timestamp)}</span>
        <span>{`(${formatUTCDate(txBlock.timestamp)})`}</span>
      </TxInfoRow>
    </>
  );
};

export default SummaryInfo;
