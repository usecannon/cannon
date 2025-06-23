import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';

type AgeColumnProps = {
  info: any;
  isUtcDate: boolean;
};

const AgeColumn: React.FC<AgeColumnProps> = ({ info, isUtcDate }) => {
  const timestamp = info.getValue();
  const dateTime = format(
    new Date(Number(timestamp) * 1000),
    'yyyy-MM-dd H:mm:ss'
  );

  const timeAgo = formatDistanceToNow(new Date(timestamp * 1000)) + ' ago';
  return (
    <Tooltip>
      <TooltipTrigger>
        <span>{isUtcDate ? dateTime : timeAgo}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span>{isUtcDate ? timeAgo : dateTime}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export default AgeColumn;
