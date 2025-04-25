import { FC, useMemo } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ChainData = {
  id: number;
  name: string;
  color?: string;
  [key: string]: any;
  hideId?: boolean;
};

const ChainIcon: FC<{ id: number; color: string }> = ({ id, color }) =>
  id === 13370 ? (
    <img
      className="h-3 w-3 object-contain"
      src="/images/logomark.svg"
      alt="Cannon"
    />
  ) : (
    <div
      className="h-3 w-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );

const Chain: FC<{
  id: number;
  isSmall?: boolean;
  chainData?: ChainData;
  hideId?: boolean;
}> = ({ id, isSmall, hideId }) => {
  const { getChainById, chainMetadata } = useCannonChains();
  const chain = useMemo(() => getChainById(+id), [id]);
  const name = chain?.name || 'Unknown Chain';
  const color = chainMetadata[+id]?.color || '#4B5563';

  const icon = <ChainIcon id={id} color={color} />;

  return (
    <div className="flex items-center gap-1.5">
      {isSmall ? (
        <Tooltip>
          <TooltipTrigger>{icon}</TooltipTrigger>
          <TooltipContent>
            <p>
              {name}
              {!hideId ? ` (ID ${id})` : ''}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          {icon}
          <div className="flex gap-1.5 items-baseline">
            <span>{name}</span>
            {!hideId && (
              <span className="text-xs text-muted-foreground tracking-[-0.3px]">
                ID {id}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Chain;
