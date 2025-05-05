import { FC } from 'react';
import Link from 'next/link';
import Chain from './Chain';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ChainNav: FC<{
  variants: any[];
  packageName: string;
}> = ({ variants, packageName }) => {
  const { getChainById } = useCannonChains();
  const sortedVariants = [...variants].sort((a, b) => {
    if (a.chain_id === 13370) return -1;
    if (b.chain_id === 13370) return 1;
    return a.chain_id - b.chain_id;
  });

  return (
    <div className="flex gap-2">
      {sortedVariants.map((variant) => (
        <Tooltip key={variant.id}>
          <TooltipTrigger asChild>
            <Link
              href={`/packages/${packageName}/${variant.tag.name}/${variant.chain_id}-${variant.preset}`}
              className="inline-flex items-center justify-center px-1 py-1 text-xs border border-gray-500 bg-gray-900 hover:bg-gray-800 rounded-md"
            >
              <Chain id={variant.chain_id} isSmall />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            {getChainById(variant.chain_id)?.name + ` (ID ${variant.chain_id})`}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default ChainNav;
