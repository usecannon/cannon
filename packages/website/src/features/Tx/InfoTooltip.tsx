import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type InfoTooltipProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  trigger,
  children,
  side = 'top',
}) => {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-default">{trigger}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm text-center">
        {children}
      </TooltipContent>
    </Tooltip>
  );
};

export default InfoTooltip;
