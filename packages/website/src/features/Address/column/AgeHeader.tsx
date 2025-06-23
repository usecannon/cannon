import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

type AgeHeaderProps = {
  isUtcDate: boolean;
  setIsUtcDate: (isUtcDate: boolean) => void;
};

const AgeHeader: React.FC<AgeHeaderProps> = ({ isUtcDate, setIsUtcDate }) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          onClick={() => {
            setIsUtcDate(!isUtcDate);
          }}
          className="h-8 px-2"
        >
          <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
            {isUtcDate ? 'Date Time' : 'Age'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>
          {isUtcDate
            ? 'Click to show Age Format'
            : 'Click to show Datetime Format'}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};

export default AgeHeader;
