'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { Flex, Container } from '@chakra-ui/react';
import { PackageCard } from '../Search/PackageCard/PackageCard';
import { CustomSpinner } from '@/components/CustomSpinner';

export const PackagePage: FC<{
  name: string;
}> = ({ name }) => {
  const { data } = useQuery<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const [pkg, setPackage] = useState<any | null>(null);

  return (
    <Flex flexDirection="column" width="100%">
      {pkg ? (
        <Container maxW="container.xl" my={[4, 4, 16]}>
          <PackageCard pkg={pkg} />
        </Container>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
};

export default PackagePage;
