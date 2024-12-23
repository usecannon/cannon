'use client';

import { FC } from 'react';
import { PackageReference } from '@usecannon/builder';
import { DeploymentExplorer } from '@/features/Packages/DeploymentExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePackageByRef } from '@/hooks/api/usePackage';

export const DeploymentTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const [chainId, preset] = PackageReference.parseVariant(
    decodeURIComponent(variant)
  );

  const packagesQuery = usePackageByRef({
    name,
    tag,
    preset,
    chainId,
  });

  if (packagesQuery.isPending) {
    return <CustomSpinner />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <div className="flex flex-col w-full">
      <DeploymentExplorer pkg={packagesQuery.data} />
    </div>
  );
};

export default DeploymentTab;
