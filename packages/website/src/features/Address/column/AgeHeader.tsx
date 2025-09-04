import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

type AgeHeaderProps = {
  isDate: boolean;
  setIsDate: (isDate: boolean) => void;
};

const AgeHeader: React.FC<AgeHeaderProps> = ({ isDate, setIsDate }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={() => {
            setIsDate(!isDate);
          }}
          className="h-8 px-2"
        >
          <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
            {isDate ? 'Date Time' : 'Age'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>
          {isDate
            ? 'Click to show Age Format'
            : 'Click to show Datetime Format'}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};

export default AgeHeader;
