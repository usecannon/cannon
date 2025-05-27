import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { convertToGwei, convertToFormatEther } from '@/lib/transaction';
import { Chain } from '@/types/Chain';

type LayerFeeDetailProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: Chain;
};

const LayerFeeDetail: React.FC<LayerFeeDetailProps> = ({
  tx,
  txReceipt,
  chain,
}) => {
  return (
    <>
      {txReceipt.l1Fee && txReceipt.l1GasPrice && txReceipt.l1GasUsed && (
        <>
          <hr className="opacity-75" />
          <TxInfoRow label="L2 Fees Paid:" description="L2 Fees Paid">
            <span>{`${convertToFormatEther(
              (tx.gasPrice ?? 0n) * (txReceipt.gasUsed ?? 0n),
              chain?.nativeCurrency.symbol
            )}`}</span>
          </TxInfoRow>
          <TxInfoRow label="L1 Fees Paid:" description="L1 Fees Paid">
            <span>{`${convertToFormatEther(
              txReceipt.l1Fee ?? 0n,
              chain?.nativeCurrency.symbol
            )} `}</span>
          </TxInfoRow>
          <TxInfoRow label="L1 Gas Price:" description="L1 Gas Price">
            <span>{`${convertToFormatEther(
              txReceipt.l1GasPrice ?? 0n,
              chain?.nativeCurrency.symbol
            )} (${convertToGwei(txReceipt.l1GasPrice ?? 0n)})`}</span>
          </TxInfoRow>
          <TxInfoRow
            label="L1 Gas Used by Txn:"
            description="L1 Gas Used by Transaction"
          >
            <span>{`${(txReceipt.l1GasUsed ?? 0n).toLocaleString()}`}</span>
          </TxInfoRow>
          <TxInfoRow label="L1 Fee Scalar:" description="L1 Fee Scalar">
            <span>{`${String(txReceipt.l1FeeScalar ?? 0)}`}</span>
          </TxInfoRow>
        </>
      )}
    </>
  );
};

export default LayerFeeDetail;
