import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { convertToFormatEther, convertToGwei } from '@/lib/transaction';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { Chain } from '@/types/Chain';
import InfoTooltip from '@/features/Txn/InfoTooltip';

type ConstInfoProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  chain: Chain;
};

const CostInfo: React.FC<ConstInfoProps> = ({ tx, txReceipt, chain }) => {
  const transactionFeeTrigger = (
    <span className="">
      {`${convertToFormatEther(
        txReceipt.l1Fee
          ? tx.gasPrice! * txReceipt.gasUsed + txReceipt.l1Fee
          : tx.gasPrice! * txReceipt.gasUsed,
        chain?.nativeCurrency.symbol
      )}`}
    </span>
  );

  return (
    <>
      <TxInfoRow
        label="Value:"
        description={`The value being transacted in ${chain?.nativeCurrency.symbol} and fital value. Note;
                    You can click the fiat value(if available) tto see
                    historical value at the time of transaction.`}
      >
        <span>{`${convertToFormatEther(
          tx.value,
          chain?.nativeCurrency.symbol
        )}`}</span>
      </TxInfoRow>

      {tx.gasPrice !== undefined && (
        <>
          <TxInfoRow
            label="Transaction Fee:"
            description="Amount paid to the validator for processing the transaction."
          >
            <InfoTooltip trigger={transactionFeeTrigger}>
              Gas Price * Gas Used by Transaction
            </InfoTooltip>
          </TxInfoRow>
          <TxInfoRow
            label="Gas Price:"
            description={`Cost per unit of gas specified for the transaction, in ${chain?.nativeCurrency.symbol} and Gwei. The higher the gas price the higher chance of getting included in a block.`}
          >
            <span>{convertToGwei(tx.gasPrice).toLocaleString()}</span>
            <span className="text-gray-400">
              (
              {`${convertToFormatEther(
                tx.gasPrice,
                chain?.nativeCurrency.symbol
              )}`}
              )
            </span>
          </TxInfoRow>
        </>
      )}
    </>
  );
};

export default CostInfo;
