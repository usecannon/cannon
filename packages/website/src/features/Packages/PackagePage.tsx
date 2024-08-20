'use client';

import { FC } from 'react';
import { Flex, Container } from '@chakra-ui/react';
import { PackageCard } from '../Search/PackageCard/PackageCard';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQuery } from '@tanstack/react-query';
import { getPackage } from '@/helpers/api';
import Custom404 from '@/pages/404';

export const PackagePage: FC<{
  name: string;
}> = ({ name }) => {
  // TODO: Handle pagination
  const packagesQuery = useQuery({
    queryKey: ['package', name],
    queryFn: getPackage,
  });

  return (
    <Flex flexDirection="column" width="100%">
      {packagesQuery.isPending ? (
        <CustomSpinner m="auto" />
      ) : packagesQuery.data ? (
        <Container maxW="container.xl" my={[4, 4, 16]}>
          <PackageCard pkgs={packagesQuery.data.data} />
        </Container>
      ) : (
        <Flex m="auto">
          <Custom404 text="Package not found" />
        </Flex>
      )}
    </Flex>
  );
};

export default PackagePage;
