import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import Link from 'next/link';
import { ClipboardButton } from '@/components/ClipboardButton';

type ToColumnProps = {
  info: any;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
  address: string;
  chainId: number;
};

const ToColumn: React.FC<ToColumnProps> = ({
  info,
  hoverId,
  setHoverId,
  address,
  chainId,
}) => {
  const toAddress = info.getValue();
  const contractAddress = info.row.getValue('contractAddress');
  const displayAddress = `${toAddress.substring(0, 10)}...${toAddress.slice(
    -9
  )}`;

  return (
    <div className="flex items-center space-x-2">
      {toAddress === '' ? (
        <>
          <Tooltip>
            <TooltipTrigger>
              <Link
                href={`/address/${chainId}/${contractAddress}`}
                className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
              >
                <span className="font-mono">Contract Creation</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col itemx-center text-center">
                <span>New Contract</span>
                <span>{contractAddress}</span>
              </div>
            </TooltipContent>
          </Tooltip>
          <ClipboardButton text={contractAddress} />
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger>
              {toAddress.toLowerCase() === address.toLowerCase() ? (
                <HoverHighlight
                  id={toAddress}
                  hoverId={hoverId}
                  setHoverId={setHoverId}
                >
                  <span className="font-mono">{displayAddress}</span>
                </HoverHighlight>
              ) : (
                <Link href={`/address/${chainId}/${toAddress}`}>
                  <HoverHighlight
                    id={toAddress}
                    hoverId={hoverId}
                    setHoverId={setHoverId}
                  >
                    <span className="font-mono">{displayAddress}</span>
                  </HoverHighlight>
                </Link>
              )}
            </TooltipTrigger>
            <TooltipContent>{toAddress}</TooltipContent>
          </Tooltip>
          <ClipboardButton text={toAddress} />
        </>
      )}
    </div>
  );
};

export default ToColumn;
