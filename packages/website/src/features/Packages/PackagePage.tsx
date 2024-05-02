'use client';

import { FC } from 'react';
import { Flex, Container } from '@chakra-ui/react';
import { PackageCard } from '../Search/PackageCard/PackageCard';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQuery } from '@tanstack/react-query';
import { getPackage } from '@/helpers/api';

export const PackagePage: FC<{
  name: string;
}> = ({ name }) => {
  const packagesQuery = useQuery({
    queryKey: ['package', name],
    queryFn: getPackage,
  });

  return (
    <Flex flexDirection="column" width="100%">
      {!packagesQuery.isPending ? (
        <Container maxW="container.xl" my={[4, 4, 16]}>
          <PackageCard pkg={packagesQuery?.data?.content} />
        </Container>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
};

export default PackagePage;
