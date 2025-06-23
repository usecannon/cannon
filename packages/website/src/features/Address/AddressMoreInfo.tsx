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

type AddressMoreInfoProps = {
  address: string;
  chainId: number | undefined;
  receipts: any[];
  afterTxs: any;
};

const AddressMoreInfo: React.FC<AddressMoreInfoProps> = ({
  address,
  chainId,
  receipts,
  afterTxs,
}) => {
  const receipt = afterTxs.receipts[0];

  const oldestSentTx = afterTxs.receipts
    .reverse()
    .find((tx: any) => address.toLowerCase() === tx.from.toLowerCase());

  const latestSentTx = receipts.find(
    (tx: any) => address.toLowerCase() === tx.from.toLowerCase()
  );

  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>More Info</CardTitle>
        </CardHeader>
        <CardContent>
          <h5 className="text-gray-500">TRANSACNS SENT</h5>
          <div className="flex items-center mb-4">
            <span className="text-gray-400 mr-2 text-sm">Latest:</span>
            <Link
              href={`/tx/${chainId}/${latestSentTx.transactionHash}`}
              className="flex items-center border-b border-dotted border-muted-foreground text-sm"
            >
              <span className="mr-1">
                {formatDistanceToNow(new Date(latestSentTx.timestamp * 1000)) +
                  ' ago'}
              </span>
              <MoveUpRight className="h-4 w-4" />
            </Link>
            <span className="text-gray-400 ml-4 mr-2 text-sm">First:</span>
            <Link
              href={`/tx/${chainId}/${oldestSentTx.transactionHash}`}
              className="flex items-center border-b border-dotted border-muted-foreground text-sm"
            >
              <span className="mr-1">
                {formatDistanceToNow(new Date(oldestSentTx.timestamp * 1000)) +
                  ' ago'}
              </span>
              <MoveUpRight className="h-4 w-4" />
            </Link>
          </div>
          {receipt && receipt.to === null && receipt.contractAddress != null ? (
            <>
              <h5 className="text-gray-500">Contract Creator</h5>
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href={`/address/${chainId}/${receipt.contractAddress}`}
                      className="mr-2 border-b border-dotted border-muted-foreground text-sm"
                    >
                      {`${receipt.contractAddress.substring(
                        0,
                        10
                      )}...${receipt.contractAddress.slice(-9)}`}
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
                  className="flex items-center border-b border-dotted border-muted-foreground text-sm"
                >
                  <span className="mr-1">
                    {formatDistanceToNow(new Date(receipt.timestamp * 1000)) +
                      ' ago'}
                  </span>
                  <MoveUpRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h5 className="text-gray-500">FUNDED BY</h5>
              <div className="flex items-center mb-4">
                <Link href={`/address/${chainId}/${receipt.from}`}>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="mr-2 border-b border-dotted border-muted-foreground text-sm">{`${receipt.from.substring(
                        0,
                        10
                      )}...${receipt.from.slice(-9)}`}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>{receipt.from}</span>
                    </TooltipContent>
                  </Tooltip>
                </Link>
                <ClipboardButton text={receipt.from} />
                <span className="mx-2 text-gray-400">|</span>
                <Link
                  href={`/tx/${chainId}/${receipt.transactionHash}`}
                  className="flex items-center border-b border-dotted border-muted-foreground"
                >
                  <span className="mr-1 order-b border-dotted border-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(receipt.timestamp * 1000)) +
                      ' ago'}
                  </span>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AddressMoreInfo;
