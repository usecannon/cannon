'use client';

import { FC } from 'react';
import { Flex, Container } from '@chakra-ui/react';
import { PackageCard } from '../Search/PackageCard/PackageCard';
import { CustomSpinner } from '@/components/CustomSpinner';
import Custom404 from '@/pages/404';
import { usePackageByName } from '@/hooks/api/usePackage';

export const PackagePage: FC<{
  name: string;
}> = ({ name }) => {
  const packagesQuery = usePackageByName({ name });

  if (packagesQuery.isLoading) {
    return <CustomSpinner m="auto" />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

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
