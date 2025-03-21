import { FC } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { ApiPackage } from '@usecannon/api/dist/src/types';

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
    <div className="flex">
      <div className="flex items-center gap-6 text-gray-300 text-xs font-mono">
        {pkg?.deployUrl && (
          <a
            href={convertUrl(pkg.deployUrl)}
            className="flex items-center no-underline hover:no-underline"
            data-testid="ipfs-deployment-link"
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
              data-testid="ipfs-code-link"
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
    </div>
  );
};
