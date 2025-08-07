import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';

const TxFeeHeader = () => {
  return (
    <div className="flex items-center space-x-2">
      <span>Method</span>
      <Tooltip>
        <TooltipTrigger>
          <CircleHelp className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent>
          Function executed based on decoded input data.
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default TxFeeHeader;
