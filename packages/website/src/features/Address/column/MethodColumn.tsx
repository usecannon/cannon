import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import DetailBadge from '@/features/Tx/detail/DetailBadge';

type MethodColumnProps = { info: any };

const MethodColumn: React.FC<MethodColumnProps> = ({ info }) => {
  const method = info.getValue();
  return (
    <Tooltip>
      <TooltipTrigger>
        <DetailBadge
          value={method.length > 10 ? `${method.slice(0, 10)}...` : method}
        />
      </TooltipTrigger>
      <TooltipContent>{method}</TooltipContent>
    </Tooltip>
  );
};

export default MethodColumn;
