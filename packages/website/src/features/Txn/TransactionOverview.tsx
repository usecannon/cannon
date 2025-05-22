import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ClipboardButton } from '@/components/ClipboardButton';
import { CircleCheck, CircleX, Clock5, CircleHelp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import {
  convertToFormatEther,
  convertToGwei,
  getDifferentDays,
} from '@/lib/transaction';

type TransactionOverviewProps = {
  tx: GetTransactionReturnType;
  txReceipt: ExtendedTransactionReceipt;
  txBlock: GetBlockReturnType;
  chain: ReturnType<ReturnType<typeof useCannonChains>['getChainById']>;
  getExplorerUrl: ReturnType<typeof useCannonChains>['getExplorerUrl'];
};

const TransactionOverview: React.FC<TransactionOverviewProps> = ({
  tx,
  txReceipt,
  txBlock,
  chain,
  getExplorerUrl,
}) => {
  return (
    <>
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>Transaction Hash:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                <span>{tx.hash}</span>
                <ClipboardButton text={tx.hash} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>Status:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2">
                {txReceipt.status === 'success' ? (
                  <span className="px-2 py-1 text-xs font-semibold text-green-600 border border-green-600 rounded-md flex items-center gap-1">
                    <CircleCheck className="w-3 h-3" />
                    <span>{txReceipt.status}</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold text-red-600 border border-red-600 rounded-md flex items-center gap-1">
                    <CircleX className="w-3 h-3" />
                    <span>{txReceipt.status}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>Block:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2">
                <span>{tx.blockNumber.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>Timestamp:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2">
                <Clock5 className="w-4 h-4 text-gray-400" />
                <span>{getDifferentDays(txBlock.timestamp)}</span>
              </div>
            </div>
            <hr className="opacity-75" />
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>From:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                {tx.chainId !== undefined ? (
                  <a
                    href={getExplorerUrl(tx.chainId, tx.from)}
                    className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{tx.from}</span>
                  </a>
                ) : (
                  <>
                    <span>{tx.from}</span>
                  </>
                )}
                <ClipboardButton text={tx.from} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>To:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
                {tx.chainId !== undefined && tx.to !== null ? (
                  <>
                    <a
                      href={getExplorerUrl(tx.chainId, tx.to)}
                      className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground hover:text-foreground"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>
                        {tx.to ? tx.to : `${txReceipt.contractAddress}`}
                      </span>
                    </a>
                    <ClipboardButton text={tx.to} />
                  </>
                ) : (
                  <>
                    <span>
                      {tx.to ? tx.to : `${txReceipt.contractAddress} Created`}
                    </span>
                    <ClipboardButton
                      text={
                        txReceipt.contractAddress
                          ? txReceipt.contractAddress
                          : ''
                      }
                    />
                  </>
                )}
              </div>
            </div>
            <hr className="opacity-75" />
            <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
              <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                <CircleHelp className="h-4 w-4" />
                <span>Value:</span>
              </div>
              <div className="w-full sm:w-3/4 flex items-center gap-2">
                <span>{`${convertToFormatEther(
                  tx.value,
                  chain?.nativeCurrency.symbol
                )}`}</span>
              </div>
            </div>
            {tx.gasPrice !== undefined && (
              <>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
                    <CircleHelp className="h-4 w-4" />
                    <span>Transaction Fee:</span>
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">
                        <span className="">
                          {`${convertToFormatEther(
                            tx.gasPrice * txReceipt.gasUsed,
                            chain?.nativeCurrency.symbol
                          )}`}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm text-center">
                        Gas Price * Gas Used by Transaction
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
                  <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
                    Gas Price:
                  </div>
                  <div className="w-full sm:w-3/4 flex items-center gap-2">
                    <span>{convertToGwei(tx.gasPrice).toLocaleString()}</span>
                    <span className="text-gray-400">
                      (
                      {`${convertToFormatEther(
                        tx.gasPrice,
                        chain?.nativeCurrency.symbol
                      )}`}
                      )
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionOverview;
