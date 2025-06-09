import React from 'react';
import TxInfoRow from '@/features/Tx/TxInfoRow';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Clock5 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { GetTransactionReturnType } from 'viem';
import { formatUTCDate } from '@/lib/transaction';
import DetailBadge from '@/features/Tx/detail/DetailBadge';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { formatDistanceToNow } from 'date-fns';

type SummaryInfoProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  timestamp: bigint;
  latestBlockNumber: bigint;
};

const SummaryInfo: React.FC<SummaryInfoProps> = ({
  tx,
  txReceipt,
  timestamp,
  latestBlockNumber,
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
        <span>{String(tx.blockNumber)}</span>
        <DetailBadge
          value={
            txReceipt.l1Fee != null
              ? 'Confirmed by Sequencer'
              : `${String(
                  latestBlockNumber - txReceipt.blockNumber
                )} Block Confirmations`
          }
        />
      </TxInfoRow>
      <TxInfoRow
        label="Timestamp:"
        description="The date and time at which a transaction is produced."
      >
        <Clock5 className="w-4 h-4 text-gray-400" />
        <span>{`${formatDistanceToNow(Number(timestamp) * 1000)} agp`}</span>
        <span>{`(${formatUTCDate(timestamp)})`}</span>
      </TxInfoRow>
    </>
  );
};

export default SummaryInfo;
