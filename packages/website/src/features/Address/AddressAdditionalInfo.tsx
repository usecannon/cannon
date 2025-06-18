import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Check, MoveUpRight, X } from 'lucide-react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GetTransactionReturnType, Hash, createPublicClient, http } from 'viem';
import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { Chain } from '@/types/Chain';
import { convertToFormatEther } from '@/lib/transaction';

type AddressAdditionalInfoProps = {
  info: any;
  openToolTipIndex: number;
  setOpenTooltipIndex: (openToolTipIndex: number) => void;
  chain: Chain;
  txHash: string;
  method: string;
};

const AddressAdditionalInfo: React.FC<AddressAdditionalInfoProps> = ({
  info,
  openToolTipIndex,
  setOpenTooltipIndex,
  chain,
  txHash,
  method,
}) => {
  const rowIndex = info.row.index;
  const chainId = chain?.id;
  const [tx, setTx] = useState<GetTransactionReturnType>();
  const [txReceipt, setTxreceipt] = useState<ExtendedTransactionReceipt>();
  const [latestBlockNumber, setLatestBlockNumber] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getTransactionData = async () => {
      if (openToolTipIndex === rowIndex) {
        const publicClient = createPublicClient({
          chain,
          transport: http(chain?.rpcUrls.default.http[0]),
        });

        const transaction = await publicClient.getTransaction({
          hash: txHash as Hash,
        });
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as Hash,
        });
        const blockNumber = await publicClient.getBlockNumber();
        setTx(transaction);
        setTxreceipt(receipt);
        setLatestBlockNumber(blockNumber);
        setIsLoading(false);
      }
    };
    getTransactionData();
  }, [openToolTipIndex]);

  return (
    <>
      <Popover
        open={openToolTipIndex === rowIndex}
        onOpenChange={(open) => {
          setOpenTooltipIndex(open ? rowIndex : null);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs text-gray-200 border border-gray-800 bg-gray-800 border-opacity-75 bg-opacity-0 rounded-lg"
            onClick={() => setOpenTooltipIndex(info.row.index)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="overflow-y-auto overflow-x-hidden w-auto"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
          ) : (
            <>
              <h5 className="mb-4 font-bold">Additional Info</h5>
              <div className="mb-4">
                <h6>Status:</h6>
                <div className="flex items-center space-x-1">
                  {txReceipt?.status === 'success' ? (
                    <>
                      <Check className="w-3 h-3 items-center justify-center text-xs text-green-900 rounded-full font-bold bg-green-200 border border-green-200" />
                      <span className="text-green-200">
                        {txReceipt?.status}
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3 items-center justify-center text-xs text-red-900 rounded-full font-bold bg-red-200 border border-red-200" />
                      <span className="text-red-200">{txReceipt?.status}</span>
                    </>
                  )}
                  <span className="text-gray-400">
                    {`(${String(
                      latestBlockNumber - BigInt(txReceipt?.blockNumber ?? 0n)
                    )} Block Confirmations)`}
                  </span>
                </div>
              </div>
              <hr />
              {tx?.to != null && tx?.value != null && method === 'Transfer' && (
                <>
                  <div className="my-4">
                    <h6>Transaction Action:</h6>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">Transfer</span>
                      <span className="">
                        {convertToFormatEther(
                          tx.value,
                          chain?.nativeCurrency.symbol
                        )}
                      </span>
                      <span className="text-gray-400">to</span>
                      <span className="">{`${tx.to.substring(
                        0,
                        8
                      )}...${tx.to.slice(-6)}`}</span>
                    </div>
                  </div>
                </>
              )}
              {tx?.gasPrice != null && txReceipt?.gasUsed != null && (
                <>
                  <hr />
                  <div className="my-4">
                    <h6>Transaction Fee:</h6>
                    <div className="flex items-center space-x-1">
                      <span className="">{`${convertToFormatEther(
                        tx.gasPrice * txReceipt.gasUsed,
                        chain?.nativeCurrency.symbol
                      )}`}</span>
                    </div>
                  </div>
                </>
              )}
              {txReceipt?.gasUsed != null && tx?.gas != null && (
                <>
                  <hr />
                  <div className="my-4">
                    <h6>Gas Info:</h6>
                    <div className="flex items-center space-x-1">
                      <span className="">{`${txReceipt.gasUsed.toLocaleString()} gas used from ${tx.gas.toLocaleString()} limit`}</span>
                    </div>
                  </div>
                </>
              )}
              <hr />
              <div className="my-4">
                <h6>Nounce:</h6>
                <div className="flex items-center space-x-1">
                  <span className="">{tx?.nonce}</span>
                  <span className="text-gray-400">{`(in the position ${tx?.transactionIndex})`}</span>
                </div>
              </div>
              <hr />
              <div className="my-4">
                <div className="flex items-center space-x-1">
                  <Link
                    href={`/tx/${chainId}/${tx?.hash}`}
                    className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                  >
                    <span>See more details</span>
                    <MoveUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>{' '}
            </>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
};

export default AddressAdditionalInfo;
