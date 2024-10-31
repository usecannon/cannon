import { links } from '@/constants/links';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { FC } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Chain from './PackageCard/Chain';

interface ChainFilterProps {
  id: number;
  isSelected: boolean;
  toggleSelection: (id: number) => void;
}

export const ChainFilter: FC<ChainFilterProps> = ({
  id,
  isSelected,
  toggleSelection,
}) => {
  return (
    <div
      className={`flex items-center mb-2 px-2 py-1 rounded-md border cursor-pointer
        ${isSelected ? 'bg-gray-700 border-gray-700' : 'border-gray-700'}
        ${isSelected ? 'hover:bg-gray-600' : 'hover:bg-gray-800'}`}
      onClick={() => toggleSelection(id)}
    >
      <Chain id={id} />
      {id === 13370 && (
        <div className="ml-auto">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger>
                <InfoCircledIcon className="text-gray-300 hover:opacity-80" />
              </TooltipTrigger>
              <TooltipContent 
                className="max-w-[250px] bg-gray-700 border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="p-2 text-sm text-gray-200">
                  These packages can be{' '}
                  <Link
                    href={links.DOCS_CLI_RUN}
                    className="underline hover:text-gray-300"
                  >
                    run locally
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={links.DOCS_CANNONFILE_PROVISION}
                    className="underline hover:text-gray-300"
                  >
                    cloned by cannonfiles
                  </Link>
                  .
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};
