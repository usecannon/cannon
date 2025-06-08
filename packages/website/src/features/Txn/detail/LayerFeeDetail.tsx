import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { convertToGwei, convertToFormatEther } from '@/lib/transaction';

type LayerFeeDetailProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  symbol: string;
};

const LayerFeeDetail: React.FC<LayerFeeDetailProps> = ({
  tx,
  txReceipt,
  symbol,
}) => {
  return (
    <>
      {txReceipt.l1Fee != null &&
        txReceipt.l1GasPrice != null &&
        txReceipt.l1GasUsed != null && (
          <>
            <hr className="opacity-75" />
            <TxInfoRow label="L2 Fees Paid:" description="L2 Fees Paid">
              <span>{`${convertToFormatEther(
                (tx.gasPrice ?? 0n) * (txReceipt.gasUsed ?? 0n),
                symbol
              )}`}</span>
            </TxInfoRow>
            <TxInfoRow label="L1 Fees Paid:" description="L1 Fees Paid">
              <span>{`${convertToFormatEther(txReceipt.l1Fee, symbol)} `}</span>
            </TxInfoRow>
            <TxInfoRow label="L1 Gas Price:" description="L1 Gas Price">
              <span>{`${convertToFormatEther(
                txReceipt.l1GasPrice,
                symbol
              )} (${convertToGwei(txReceipt.l1GasPrice)})`}</span>
            </TxInfoRow>
            <TxInfoRow
              label="L1 Gas Used by Txn:"
              description="L1 Gas Used by Transaction"
            >
              <span>{`${
                typeof txReceipt.l1GasUsed === 'string'
                  ? String(parseInt(txReceipt.l1GasUsed.slice(2), 16))
                  : txReceipt.l1GasUsed.toLocaleString()
              }`}</span>
            </TxInfoRow>
            <TxInfoRow label="L1 Fee Scalar:" description="L1 Fee Scalar">
              <span>{`${
                typeof txReceipt.l1FeeScalar === 'string'
                  ? String(parseInt(txReceipt.l1FeeScalar.slice(2), 16))
                  : String(txReceipt.l1FeeScalar ?? 0)
              }`}</span>
            </TxInfoRow>
          </>
        )}
    </>
  );
};

export default LayerFeeDetail;
