import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function UnavailableTransaction() {
  return (
    <span className="text-muted-foreground italic">
      Unavailable
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1.5 inline-flex items-center cursor-pointer">
              <HelpCircle className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px]">
            This transaction may have been executed using the web deployer.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
