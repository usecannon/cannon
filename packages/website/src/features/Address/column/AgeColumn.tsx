import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { formatDateTime } from '@/lib/address';

type AgeColumnProps = {
  info: any;
  isDate: boolean;
};

const AgeColumn: React.FC<AgeColumnProps> = ({ info, isDate }) => {
  const timestamp = info.getValue();
  const dateTime = formatDateTime(timestamp);

  const timeAgo = formatDistanceToNow(new Date(timestamp * 1000)) + ' ago';
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className="cursol-defualt">{isDate ? dateTime : timeAgo}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span>{isDate ? timeAgo : dateTime}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export default AgeColumn;
