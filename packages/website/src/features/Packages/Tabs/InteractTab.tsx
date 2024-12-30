'use client';

import { FC, ReactNode } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DeploymentInfo } from '@usecannon/builder';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { usePackageByRef } from '@/hooks/api/usePackage';
import { IpfsSpinner } from '@/components/IpfsSpinner';

export const InteractTab: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const { name, tag, preset, chainId } = usePackageNameTagVersionUrlParams();
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  return (
    <>
      {isLoadingData ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
        </div>
      ) : (
        <div>{children}</div>
      )}
    </>
  );
};

export default InteractTab;
