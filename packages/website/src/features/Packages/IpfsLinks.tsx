import { FC } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { CheckCircledIcon, MinusCircledIcon } from '@radix-ui/react-icons';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

export const IpfsLinks: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

  const convertUrl = (url: string) => {
    return `/ipfs?cid=${url.replace('ipfs://', '')}&compressed=true`;
  };

  return (
    <TooltipProvider>
      <div className="flex">
        <div className="flex items-center gap-6 text-gray-300 text-xs font-mono">
          {pkg?.deployUrl && (
            <a
              href={convertUrl(pkg.deployUrl)}
              className="flex items-center no-underline hover:no-underline"
            >
              <img
                src="/images/ipfs.svg"
                alt="IPFS"
                className="inline-block h-[14px] mr-1.5"
              />
              <span className="inline border-b border-dotted border-gray-300">
                Deployment
              </span>
            </a>
          )}
          {deploymentInfo?.miscUrl && (
            <a
              href={convertUrl(deploymentInfo.miscUrl)}
              className="flex items-center no-underline hover:no-underline"
            >
              <img
                src="/images/ipfs.svg"
                alt="IPFS"
                className="inline-block h-[14px] mr-1.5"
              />
              <span className="inline border-b border-dotted border-gray-300">
                Code
              </span>
            </a>
          )}
          {pkg?.metaUrl && (
            <a
              href={convertUrl(pkg.metaUrl)}
              className="flex items-center no-underline hover:no-underline mr-1"
            >
              <img
                src="/images/ipfs.svg"
                alt="IPFS"
                className="inline-block h-[14px] mr-1.5"
              />
              <span className="inline border-b border-dotted border-gray-300">
                Metadata
              </span>
            </a>
          )}
        </div>
        {deploymentInfo?.status === 'complete' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="pl-[8px] md:pl-2">
                <CheckCircledIcon className="w-5 h-5 text-green-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              This deployment is complete. The resulting chain state matches the
              desired chain definition.
            </TooltipContent>
          </Tooltip>
        )}
        {deploymentInfo?.status === 'partial' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="pl-[8px] md:pl-2">
                <MinusCircledIcon className="w-5 h-5 text-yellow-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              This is a partial deployment. The resulting chain state did not
              completely match the desired chain definition.
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
