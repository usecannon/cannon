'use client';

import { FC } from 'react';
import { Flex } from '@chakra-ui/react';
import { CannonfileExplorer } from '@/features/Packages/CannonfileExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQuery } from '@tanstack/react-query';
import { getPackage } from '@/helpers/api';
import { PackageReference } from '@usecannon/builder';

export const CannonfileTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = useQuery({
    queryKey: ['package', [`${name}:${tag}@${preset}/${chainId}`]],
    queryFn: getPackage,
  });

  if (packagesQuery.isPending) {
    return <CustomSpinner m="auto" />;
  }

  return (
    <Flex flexDirection="column" width="100%" flex="1">
      <CannonfileExplorer pkg={packagesQuery.data.data} />
    </Flex>
  );
};

export default CannonfileTab;
