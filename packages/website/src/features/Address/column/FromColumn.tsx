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
  return (
    <div className="flex items-center space-x-3">
      <Link href={`/tx/${chainId}/${fromAddress}`}>
        <Tooltip>
          <TooltipTrigger>
            <HoverHighlight
              id={fromAddress}
              hoverId={hoverId!}
              setHoverId={setHoverId}
            >
              {`${fromAddress.substring(0, 10)}...${fromAddress.slice(-9)}`}
            </HoverHighlight>
          </TooltipTrigger>
          <TooltipContent>{fromAddress}</TooltipContent>
        </Tooltip>
      </Link>
      <ClipboardButton text={fromAddress} />
      {fromAddress.toLowerCase() === address.toLowerCase() ? (
        <span className="inline-flex justify-center items-center w-10 text-center font-bold px-2 py-1 text-xs text-yellow-700 border border-yellow-700 border-opacity-75 bg-opacity-10 rounded-lg">
          OUT
        </span>
      ) : (
        <span className="inline-flex justify-center items-center w-10 text-center font-bold px-2 py-1 text-xs text-green-700 border border-green-700 border-opacity-75 bg-opacity-10 rounded-lg">
          IN
        </span>
      )}
    </div>
  );
};

export default FromColumn;
