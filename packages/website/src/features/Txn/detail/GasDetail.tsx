import React from 'react';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import { GetTransactionReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import InfoTooltip from '@/features/Txn/InfoTooltip';
import {
  getTransactionSavings,
  convertToGwei,
  convertToFormatEther,
  getGasUsedPercentage,
} from '@/lib/transaction';
import DetailBadge from '@/features/Txn/detail/DetailBadge';

type GasDetailProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  baseFeePerGas: bigint;
  symbol: string;
};

const GasDetail: React.FC<GasDetailProps> = ({
  tx,
  txReceipt,
  baseFeePerGas,
  symbol,
}) => {
  const baseGasFeeTrigger = (
    <>
      <span className="text-gray-400 mr-1">Base:</span>
      <span className="mr-1">{convertToGwei(baseFeePerGas!)}</span>
    </>
  );

  const maxGasFeeTrigger = tx.maxFeePerGas !== undefined && (
    <>
      <span className="text-gray-400 mr-1">Max:</span>
      <span className="mr-1">{convertToGwei(tx.maxFeePerGas)}</span>
    </>
  );

  const maxPriorityGasFeeTrigger = tx.maxPriorityFeePerGas !== undefined && (
    <>
      <span className="text-gray-400 mr-1">Max Priority:</span>
      <span>{convertToGwei(tx.maxPriorityFeePerGas)}</span>
    </>
  );

  return (
    <>
      <TxInfoRow
        label="Gas Limit & Usage by Txn:"
        description={`Maximum amount of gas allocated for the transaction & the amount eventually used. Normal ${symbol} transfers involve 21,000 gas units while contracts involve higher values.`}
      >
        <InfoTooltip
          trigger={<span className="mr-1">{`${tx.gas.toLocaleString()}`}</span>}
        >
          The amount of FAS supplied for this transaction to happen
        </InfoTooltip>
        <span className="text-gray-400 mr-1">|</span>
        <InfoTooltip
          trigger={
            <>
              <span className="mr-1">{`${txReceipt.gasUsed.toLocaleString()}`}</span>
              <span>
                {`(${getGasUsedPercentage(txReceipt.gasUsed, tx.gas)})`}
              </span>
            </>
          }
        >
          The amount of GAS used by this specific transaction alone
        </InfoTooltip>
      </TxInfoRow>
      <TxInfoRow
        label="Gas Fees:"
        description="Base Fee refers to the network Base Fee at the time of
                        the block, while Max Fee & Max Priority Fee refer to the
                        max amount a user is willing to pay for their tx & to
                        give to the block producer respectively."
      >
        <InfoTooltip trigger={baseGasFeeTrigger}>
          {` ${convertToFormatEther(baseFeePerGas, symbol)}`}
        </InfoTooltip>
        {tx.maxFeePerGas !== undefined && (
          <>
            <span className="text-gray-400 mr-1">|</span>
            <InfoTooltip trigger={maxGasFeeTrigger}>{`${convertToFormatEther(
              tx.maxFeePerGas,
              symbol
            )}`}</InfoTooltip>
          </>
        )}
        {tx.maxPriorityFeePerGas !== undefined && (
          <>
            <span className="text-gray-400 mr-1">|</span>
            <InfoTooltip trigger={maxPriorityGasFeeTrigger}>
              {`${convertToFormatEther(tx.maxPriorityFeePerGas, symbol)}`}
            </InfoTooltip>
          </>
        )}
      </TxInfoRow>
      <TxInfoRow
        label="Burnt & Txn Savings Fees:"
        description={`Total amount of ${symbol} burnt from this tx & total fees saved from the amount the user was willing to pay for this tx.`}
      >
        <DetailBadge
          label="Burnt:"
          value={`${convertToFormatEther(
            baseFeePerGas * txReceipt.gasUsed,
            symbol
          )}`}
        />
        {tx.maxFeePerGas != undefined && (
          <DetailBadge
            label="Txn Savings:"
            value={`${getTransactionSavings(
              tx.maxFeePerGas,
              txReceipt.effectiveGasPrice,
              txReceipt.gasUsed
            )} ${symbol}`}
          />
        )}
      </TxInfoRow>
    </>
  );
};

export default GasDetail;
