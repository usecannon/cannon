import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { Minus, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import {
  getTxnTypeLabel,
  getTransactionSavings,
  convertToGwei,
  convertToFormatEther,
  getGasUsedPercentage,
} from '@/lib/transaction';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import ToggleDetail from '@/features/Txn/detail/ToggleDetail';

type TransactionDetailProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txBlock: GetBlockReturnType;
  chain: ReturnType<ReturnType<typeof useCannonChains>['getChainById']>;
};

const TransactionDetail: React.FC<TransactionDetailProps> = ({
  tx,
  txReceipt,
  txBlock,
  chain,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm mt-4 w-full mb-3">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {isOpen && (
              <>
                <TxInfoRow
                  label="Gas Limit & Usage by Txn:"
                  description={`Maximum amount of gas allocated for the transaction & the amount ecentually used. Normal ${chain?.nativeCurrency.symbol} transfers involve 21,000 gas units while contracts involve higher values.`}
                >
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <span className="mr-1">{`${tx.gas.toLocaleString()}`}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm text-center">
                      The acmount of FAS supplied for this transaction to happen
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-gray-400 mr-1">|</span>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <span className="mr-1">{`${txReceipt.gasUsed.toLocaleString()}`}</span>
                      <span>
                        {`(${getGasUsedPercentage(txReceipt.gasUsed, tx.gas)})`}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm text-center">
                      The amount of GAS used by this specific transaction alone
                    </TooltipContent>
                  </Tooltip>
                </TxInfoRow>
                <TxInfoRow
                  label="Gas Fees:"
                  description="Base Fee refers to the network Base Fee at the time of
                        the block, while Max Fee & Max Priority Fee refer to the
                        max amount a user is willing to pay for their tx & to
                        give to the block producer respectively."
                >
                  {txBlock.baseFeePerGas !== null && (
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">
                        <span className="text-gray-400 mr-1">Base:</span>
                        <span className="mr-1">
                          {convertToGwei(txBlock.baseFeePerGas)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm text-center">
                        {` ${convertToFormatEther(
                          txBlock.baseFeePerGas,
                          chain?.nativeCurrency.symbol
                        )}`}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {!!String(tx.maxFeePerGas) &&
                    tx.maxFeePerGas !== undefined && (
                      <>
                        <span className="text-gray-400 mr-1">|</span>
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            <span className="text-gray-400 mr-1">Max:</span>
                            <span className="mr-1">
                              {convertToGwei(tx.maxFeePerGas)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-center">
                            {`${convertToFormatEther(
                              tx.maxFeePerGas,
                              chain?.nativeCurrency.symbol
                            )}`}
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  {!!String(tx.maxPriorityFeePerGas) &&
                    tx.maxPriorityFeePerGas !== undefined && (
                      <>
                        <span className="text-gray-400 mr-1">|</span>
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            <span className="text-gray-400 mr-1">
                              Max Priority:
                            </span>
                            <span>
                              {convertToGwei(tx.maxPriorityFeePerGas)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-center">
                            {`${convertToFormatEther(
                              tx.maxPriorityFeePerGas,
                              chain?.nativeCurrency.symbol
                            )}`}
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                </TxInfoRow>
                <TxInfoRow
                  label="Burnt & Txn Savings Fees:"
                  description={`Total amount of ${chain?.nativeCurrency.symbol} burnt from this tx & total feses saved from the amount the user was willing to pay for this tx.`}
                >
                  {txBlock.baseFeePerGas !== null && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                      <span className="text-gray-400 mr-1">Burnt:</span>
                      <span>
                        {`${convertToFormatEther(
                          txBlock.baseFeePerGas * txReceipt.gasUsed,
                          chain?.nativeCurrency.symbol
                        )}`}
                      </span>
                    </span>
                  )}
                  {!!String(tx.maxFeePerGas) &&
                    tx.maxFeePerGas !== undefined && (
                      <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                        <span className="text-gray-400 mr-1">Txn Savings:</span>
                        <span>
                          {`${getTransactionSavings(
                            tx.maxFeePerGas,
                            txReceipt.effectiveGasPrice,
                            txReceipt.gasUsed
                          )} ${chain?.nativeCurrency.symbol}`}
                        </span>
                      </span>
                    )}
                </TxInfoRow>

                {txReceipt.l1Fee &&
                  txReceipt.l1GasPrice &&
                  txReceipt.l1GasUsed &&
                  tx.gasPrice !== undefined && (
                    <>
                      <hr className="opacity-75" />
                      <TxInfoRow
                        label="L2 Fees Paid:"
                        description="L2 Fees Paid"
                      >
                        <span>{`${convertToFormatEther(
                          tx.gasPrice * txReceipt.gasUsed,
                          chain?.nativeCurrency.symbol
                        )}`}</span>
                      </TxInfoRow>
                      <TxInfoRow
                        label="L1 Fees Paid:"
                        description="L1 Fees Paid"
                      >
                        <span>{`${convertToFormatEther(
                          txReceipt.l1Fee,
                          chain?.nativeCurrency.symbol
                        )} `}</span>
                      </TxInfoRow>
                      <TxInfoRow
                        label="L1 Gas Price:"
                        description="L1 Gas Price"
                      >
                        <span>{`${convertToFormatEther(
                          txReceipt.l1GasPrice,
                          chain?.nativeCurrency.symbol
                        )} (${convertToGwei(txReceipt.l1GasPrice)})`}</span>
                      </TxInfoRow>
                      <TxInfoRow
                        label="L1 Gas Used by Txn:"
                        description="L1 Gas Used by Transaction"
                      >
                        <span>{`${txReceipt.l1GasUsed.toLocaleString()}`}</span>
                      </TxInfoRow>
                      <TxInfoRow
                        label="L1 Fee Scalar:"
                        description="L1 Fee Scalar"
                      >
                        <span>{`${String(txReceipt.l1FeeScalar || 0)}`}</span>
                      </TxInfoRow>
                    </>
                  )}
                <hr className="opacity-75" />
                <TxInfoRow
                  label="Other Attributes:"
                  description="Other data related to this transaction."
                >
                  {tx.typeHex !== null && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                      <span className="text-gray-400 mr-1">Txn Type:</span>
                      <span>
                        {`${parseInt(tx.typeHex).toLocaleString()}`} (
                        {getTxnTypeLabel(tx.typeHex)})
                      </span>
                    </span>
                  )}
                  <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                    <span className="text-gray-400 mr-1">Nonce:</span>
                    <span>{tx.nonce.toLocaleString()}</span>
                  </span>
                  <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
                    <span className="text-gray-400 mr-1">
                      Position in Block:
                    </span>
                    <span>{tx.transactionIndex.toLocaleString()}</span>
                  </span>
                </TxInfoRow>
                <TxInfoRow
                  label="Input Data:"
                  description="Additional data included for this transaction. Commonly
                        used as part of contract interaction or as a message
                        sent to the recipient."
                >
                  <textarea
                    className="w-full h-24 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md p-2 text-xs"
                    value={`${tx.input}`}
                    readOnly
                  />
                </TxInfoRow>
                <hr className="opacity-75" />
              </>
            )}
            <ToggleDetail isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionDetail;
