import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MoveUpRight } from 'lucide-react';
import Link from 'next/link';
import { ClipboardButton } from '@/components/ClipboardButton';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { OtterscanReceipt } from '@/types/AddressList';

type AddressMoreInfoProps = {
  address: string;
  chainId: number | undefined;
  receipts: OtterscanReceipt[];
  oldReceipts: OtterscanReceipt[];
};

const AddressMoreInfo: React.FC<AddressMoreInfoProps> = ({
  address,
  chainId,
  receipts,
  oldReceipts,
}) => {
  const receipt = receipts[receipts.length - 1];
  const oldestSentReceipt = [...oldReceipts]
    .reverse()
    .find(
      (receipt: any) => address.toLowerCase() === receipt.from.toLowerCase()
    );

  const latestSentReceipt = receipts.find(
    (receipt: any) => address.toLowerCase() === receipt.from.toLowerCase()
  );

  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>More Info</CardTitle>
        </CardHeader>
        <CardContent>
          <h5 className="text-gray-500">TRANASACTION SENT</h5>
          <div className="flex items-center mb-4">
            {latestSentReceipt && (
              <>
                <span className="text-gray-400 text-sm mr-2">Latest:</span>
                <Link
                  href={`/tx/${chainId}/${latestSentReceipt.transactionHash}`}
                  className="flex items-center"
                >
                  <span className="inline-block whitespace-nowrap max-w-full overflow-hidden text-ellipsis border-b border-dotted border-muted-foreground text-sm font-mono">
                    {formatDistanceToNow(
                      new Date(latestSentReceipt.timestamp * 1000)
                    ) + ' ago'}
                  </span>
                </Link>
                <MoveUpRight className="h-4 w-4" />
              </>
            )}
            {oldestSentReceipt && (
              <>
                <span className="text-gray-400 ml-4 text-sm mr-2">First:</span>
                <Link
                  href={`/tx/${chainId}/${oldestSentReceipt.transactionHash}`}
                  className="flex items-center"
                >
                  <span className="inline-block whitespace-nowrap max-w-full overflow-hidden text-ellipsis border-b border-dotted border-muted-foreground text-sm font-mono">
                    {formatDistanceToNow(
                      new Date(oldestSentReceipt.timestamp * 1000)
                    ) + ' ago'}
                  </span>
                </Link>
                <MoveUpRight className="h-4 w-4" />
              </>
            )}
          </div>

          {receipt && receipt.to === null && receipt.contractAddress != null ? (
            <>
              <h5 className="text-gray-500">Contract Creator</h5>
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href={`/address/${chainId}/${receipt.contractAddress}`}
                      className="mr-2"
                    >
                      <span className="border-b border-dotted border-muted-foreground text-sm font-mono">{`${receipt.contractAddress.substring(
                        0,
                        10
                      )}...${receipt.contractAddress.slice(-9)}`}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col text-center">
                      <span>Creator Address</span>
                      <span>{receipt.contractAddress}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <ClipboardButton text={receipt.contractAddress} />
                <span className="mx-2 text-gray-400">|</span>
                <Link
                  href={`/tx/${chainId}/${receipt.transactionHash}`}
                  className="flex items-center"
                >
                  <span className="mr-1 font-mono inline-block whitespace-nowrap border-b border-dotted border-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(receipt.timestamp * 1000)) +
                      ' ago'}
                  </span>
                  <MoveUpRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            oldestSentReceipt &&
            oldestSentReceipt.from && (
              <>
                <h5 className="text-gray-500">FUNDED BY</h5>
                <div className="flex items-center mb-4">
                  <Link href={`/address/${chainId}/${oldestSentReceipt.from}`}>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="mr-2 border-b border-dotted border-muted-foreground text-sm font-mono">{`${oldestSentReceipt.from.substring(
                          0,
                          10
                        )}...${oldestSentReceipt.from.slice(-9)}`}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>{oldestSentReceipt.from}</span>
                      </TooltipContent>
                    </Tooltip>
                  </Link>
                  <ClipboardButton text={oldestSentReceipt.from} />
                  <span className="mx-2 text-gray-400">|</span>
                  <Link
                    href={`/tx/${chainId}/${oldestSentReceipt.transactionHash}`}
                    className="flex items-center"
                  >
                    <span className="mr-1 inline-block whitespace-nowrap border-b border-dotted border-muted-foreground text-sm font-mono">
                      {formatDistanceToNow(
                        new Date(oldestSentReceipt.timestamp * 1000)
                      ) + ' ago'}
                    </span>
                  </Link>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AddressMoreInfo;
