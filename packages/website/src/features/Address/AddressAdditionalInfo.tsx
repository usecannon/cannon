import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Eye, Check, MoveUpRight } from 'lucide-react';
import Link from 'next/link';

type AddressAdditionalInfoProps = {
  info: any;
  openToolTipIndex: number;
  setOpenTooltipIndex: (openToolTipIndex: number) => void;
  chain: any;
};

const AddressAdditionalInfo: React.FC<AddressAdditionalInfoProps> = ({
  info,
  openToolTipIndex,
  setOpenTooltipIndex,
  chain,
}) => {
  const rowIndex = info.row.index;

  return (
    <>
      <Tooltip open={openToolTipIndex === rowIndex}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs text-gray-200 border border-gray-800 bg-gray-800 border-opacity-75 bg-opacity-0 rounded-lg"
            onClick={() => setOpenTooltipIndex(info.row.index)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="w-auto overflow-y-auto overflow-x-hidden"
        >
          <h5 className="mb-4">Additional Info</h5>
          <div className="mb-4">
            <h6 className="font-bold mb-1">Status:</h6>
            <div className="flex items-center space-x-1">
              <Check className="w-3 h-3 items-center justify-center text-xs text-green-900 rounded-full font-bold bg-green-200 border border-green-200" />
              <span className="text-green-200">Success</span>
              <span className="text-gray-400">
                (124543 Block Confirmations)
              </span>
            </div>
          </div>
          <hr />
          <div className="my-4">
            <h6 className="font-bold mb-1">Transaction Action:</h6>
            <div className="flex items-center space-x-1">
              <span className="text-gray-400">Transfer</span>
              <span className="">0.023748243 ETH</span>
              <span className="text-gray-400">to</span>
              <span className="">0xsdas...dajso</span>
            </div>
          </div>
          <hr />
          <div className="my-4">
            <h6 className="font-bold mb-1">Transaction Fee:</h6>
            <div className="flex items-center space-x-1">
              <span className="">0.139002394900254 ETH</span>
            </div>
          </div>
          <hr />
          <div className="my-4">
            <h6 className="font-bold mb-1">Gas Info:</h6>
            <div className="flex items-center space-x-1">
              <span className="">2,1000 gas used from 21000 limit</span>
            </div>
          </div>
          <hr />
          <div className="my-4">
            <h6 className="font-bold mb-1">Nounce:</h6>
            <div className="flex items-center space-x-1">
              <span className="">24123</span>
              <span className="text-gray-400">(in the position 348)</span>
            </div>
          </div>
          <hr />
          <div className="my-4">
            <div className="flex items-center space-x-1">
              <Link
                href={`/tx/${chain?.id}/xxxxxxxx`}
                className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
              >
                <span>See more details</span>
                <MoveUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  );
};

export default AddressAdditionalInfo;
