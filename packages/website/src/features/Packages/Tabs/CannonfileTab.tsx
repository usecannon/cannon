'use client';

import { FC } from 'react';
import { Flex } from '@chakra-ui/react';
import { CannonfileExplorer } from '@/features/Packages/CannonfileExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { PackageReference } from '@usecannon/builder';
import { usePackageByRef } from '@/hooks/api/usePackage';

export const CannonfileTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  if (packagesQuery.isPending) {
    return <CustomSpinner m="auto" />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <Flex flexDirection="column" width="100%" flex="1">
      <CannonfileExplorer pkg={packagesQuery.data} />
    </Flex>
  );
};

export default CannonfileTab;
