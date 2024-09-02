'use client';

import { FC } from 'react';
import { Flex } from '@chakra-ui/react';
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
    return <CustomSpinner m="auto" />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <Flex flexDirection="column" width="100%">
      <DeploymentExplorer pkg={packagesQuery.data} />
    </Flex>
  );
};

export default DeploymentTab;
