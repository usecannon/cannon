import { links } from '@/constants/links';
import { Info } from 'lucide-react';
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
}

export const ChainFilter: FC<ChainFilterProps> = ({ id }) => {
  return (
    <div className="flex items-center w-full">
      <Chain id={id} />
      {id === 13370 && (
        <div className="ml-auto flex items-center">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger className="flex items-center">
                <Info className="text-gray-300" />
              </TooltipTrigger>
              <TooltipContent
                className="max-w-[250px]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-gray-200">
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
