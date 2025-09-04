import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import Link from 'next/link';
import { ClipboardButton } from '@/components/ClipboardButton';

type FromColumnProps = {
  info: any;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
  address: string;
  chainId: number;
};

const FromColumn: React.FC<FromColumnProps> = ({
  info,
  hoverId,
  setHoverId,
  address,
  chainId,
}) => {
  const fromAddress = info.getValue();
  const isSelfAddress = fromAddress.toLowerCase() === address.toLowerCase();
  const displayAddress = `${fromAddress.substring(0, 10)}...${fromAddress.slice(
    -9
  )}`;

  return (
    <div className="flex items-center space-x-3">
      <Tooltip>
        <TooltipTrigger asChild>
          {isSelfAddress ? (
            <HoverHighlight
              id={fromAddress}
              hoverId={hoverId!}
              setHoverId={setHoverId}
            >
              <span className="font-mono">{displayAddress}</span>
            </HoverHighlight>
          ) : (
            <Link href={`/address/${chainId}/${fromAddress}`}>
              <HoverHighlight
                id={fromAddress}
                hoverId={hoverId!}
                setHoverId={setHoverId}
              >
                <span className="font-mono">{displayAddress}</span>
              </HoverHighlight>
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent className="cursol-default">
          {fromAddress}
        </TooltipContent>
      </Tooltip>
      <ClipboardButton text={fromAddress} />
      <span
        className={`inline-flex justify-center items-center w-10 text-center font-bold px-2 py-1 text-xs rounded-lg border bg-opacity-10 ${
          isSelfAddress
            ? 'text-yellow-700 border-yellow-700'
            : 'text-green-700 border-green-700'
        }`}
      >
        {isSelfAddress ? 'OUT' : 'IN'}
      </span>
    </div>
  );
};

export default FromColumn;
