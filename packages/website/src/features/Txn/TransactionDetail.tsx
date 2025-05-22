import { Card, CardContent } from '@/components/ui/card';
import React, { useState } from 'react';
import { formatEther, formatUnits } from 'viem';
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
} from '@/lib/transaction';

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
  const [isOpenMoreDetails, setIsOpenMoreDetails] = useState(false);

  return (
    <>
      <Card className="rounded-sm mt-4 w-full mb-3">
        <CardContent className="pt-4">
          <div className="space-y-2">
            {isOpenMoreDetails && (
              <>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Gas Limit & Usage by Txn:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2">
                    <span className="mr-1">{`${tx.gas.toLocaleString()}`}</span>
                    <span className="text-gray-400 mr-1">|</span>
                    <span className="mr-1">{`${txReceipt.gasUsed.toLocaleString()}`}</span>
                    <span>{`(${(
                      (Number(txReceipt.gasUsed) / Number(tx.gas)) *
                      100
                    ).toFixed(2)}%)`}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Gas Fees:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
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
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Burnt & Txn Savings Fees:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
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
                          <span className="text-gray-400 mr-1">
                            Txn Savings:
                          </span>
                          <span>
                            {`${getTransactionSavings(
                              tx.maxFeePerGas,
                              txReceipt.effectiveGasPrice,
                              txReceipt.gasUsed
                            )} ${chain?.nativeCurrency.symbol}`}
                          </span>
                        </span>
                      )}
                  </div>
                </div>
                {txReceipt.l1Fee &&
                  txReceipt.l1GasPrice &&
                  txReceipt.l1GasUsed &&
                  tx.gasPrice !== undefined && (
                    <>
                      <hr className="opacity-75" />
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          L2 Fees Paid:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span>{`${convertToFormatEther(
                            tx.gasPrice * txReceipt.gasUsed,
                            chain?.nativeCurrency.symbol
                          )}`}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          L1 Fees Paid:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span>{`${convertToFormatEther(
                            txReceipt.l1Fee,
                            chain?.nativeCurrency.symbol
                          )} `}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          L1 Gas Price:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span>{`${convertToFormatEther(
                            txReceipt.l1GasPrice,
                            chain?.nativeCurrency.symbol
                          )} (${convertToGwei(txReceipt.l1GasPrice)}`}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          L1 Gas Used by Txn:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span>{`${txReceipt.l1GasUsed.toLocaleString()}`}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                        <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                          L1 Fee Scalar:
                        </div>
                        <div className="w-full sm:w-3/4 flex items-center gap-2">
                          <span>{`${String(txReceipt.l1FeeScalar || 0)}`}</span>
                        </div>
                      </div>
                    </>
                  )}
                <hr className="opacity-75" />
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Other Attributes:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
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
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Input Data:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2">
                    <textarea
                      className="w-full h-24 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md p-2 text-xs"
                      value={`${tx.input}`}
                      readOnly
                    />
                  </div>
                </div>
                <hr className="opacity-75" />
              </>
            )}
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                More Details:
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2 font-bold">
                {isOpenMoreDetails ? (
                  <span
                    className="text-gray-300 cursor-pointer flex items-center gap-1"
                    onClick={() => setIsOpenMoreDetails(false)}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Clicks to show less</span>
                  </span>
                ) : (
                  <span
                    className="text-gray-300 cursor-pointer flex items-center gap-1"
                    onClick={() => setIsOpenMoreDetails(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Clicks to show more</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionDetail;
