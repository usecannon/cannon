import { CircleHelp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TxInfoRowProps = {
  label: string;
  description: string;
  children: React.ReactNode;
};

const TxInfoRow: React.FC<TxInfoRowProps> = ({
  label,
  description,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
      <div className="flex items-center gap-1 w-full sm:w-1/4 text-left font-medium text-gray-400">
        <Tooltip>
          <TooltipTrigger className="cursor-default">
            <CircleHelp className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm text-center">
            {description}
          </TooltipContent>
        </Tooltip>
        <span>{label}</span>
      </div>
      <div className="w-full sm:w-3/4 flex items-center gap-2 break-all">
        {children}
      </div>
    </div>
  );
};

export default TxInfoRow;
