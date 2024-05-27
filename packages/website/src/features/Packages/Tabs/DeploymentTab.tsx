'use client';

import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flex } from '@chakra-ui/react';
import { PackageReference } from '@usecannon/builder';
import { DeploymentExplorer } from '@/features/Packages/DeploymentExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { getPackage } from '@/helpers/api';

export const DeploymentTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const [chainId, preset] = PackageReference.parseVariant(
    decodeURIComponent(variant)
  );

  const packagesQuery = useQuery({
    queryKey: ['package', [`${name}:${tag}@${preset}/${chainId}`]],
    queryFn: getPackage,
  });

  if (packagesQuery.isPending) {
    return <CustomSpinner m="auto" />;
  }

  return (
    <Flex flexDirection="column" width="100%">
      <DeploymentExplorer pkg={packagesQuery.data.data} />
    </Flex>
  );
};

export default DeploymentTab;
