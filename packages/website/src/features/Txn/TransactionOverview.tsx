import { Card, CardContent } from '@/components/ui/card';
import React from 'react';
import { GetTransactionReturnType, GetBlockReturnType } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Clock5 } from 'lucide-react';
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
  formatUTCDate,
} from '@/lib/transaction';
import TxInfoRow from '@/features/Txn/TxInfoRow';
import StatusBadge from '@/features/Txn/overview/StatusBadge';

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
    <div className="w-full overflow-x-auto">
      <Card className="rounded-sm mt-4 w-full">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <TxInfoRow
              label="Transaction Hash:"
              description="A TxHash or transaction hash is a unique 66-character
                    identifier that is generated whenever a transaction is
                    executed."
            >
              <span className="break-all">{tx.hash}</span>
              <ClipboardButton text={tx.hash} />
            </TxInfoRow>
            <TxInfoRow
              label="Status:"
              description="The status of the transaction."
            >
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

            <hr className="opacity-75" />
            <TxInfoRow
              label="From:"
              description="The sending party of the transaction."
            >
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
                <span>{tx.from}</span>
              )}
              <ClipboardButton text={tx.from} />
            </TxInfoRow>
            <TxInfoRow
              label="To:"
              description="The receiving party of the transaction (could be a contract
                    address)."
            >
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
                      txReceipt.contractAddress ? txReceipt.contractAddress : ''
                    }
                  />
                </>
              )}{' '}
            </TxInfoRow>
            <hr className="opacity-75" />
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
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <span className="">
                        {`${convertToFormatEther(
                          txReceipt.l1Fee
                            ? tx.gasPrice * txReceipt.gasUsed + txReceipt.l1Fee
                            : tx.gasPrice * txReceipt.gasUsed,
                          chain?.nativeCurrency.symbol
                        )}`}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm text-center">
                      Gas Price * Gas Used by Transaction
                    </TooltipContent>
                  </Tooltip>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionOverview;
