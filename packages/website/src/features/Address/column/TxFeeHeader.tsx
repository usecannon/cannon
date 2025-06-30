import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

type TxFeeHeaderProps = {
  isGasPrice: boolean;
  setIsGasPrice: (isGasPrice: boolean) => void;
};

const TxFeeHeader: React.FC<TxFeeHeaderProps> = ({
  isGasPrice,
  setIsGasPrice,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => {
            setIsGasPrice(!isGasPrice);
          }}
          className="h-8 px-2"
        >
          <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
            {isGasPrice ? 'GasPrice' : 'Txn Fee'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>
          {isGasPrice
            ? '(Gas Price * Gas Used bt Txn) in Either'
            : 'Gas Price in Gwei'}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};

export default TxFeeHeader;
