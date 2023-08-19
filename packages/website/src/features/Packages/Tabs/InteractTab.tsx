'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import {
  GetPackageQuery,
  GetPackageQueryVariables,
  GetPackagesQuery,
} from '@/types/graphql/graphql';
import { useQuery } from '@apollo/client';
import { Container, Flex, Spinner } from '@chakra-ui/react';
import { Interact } from '@/features/Packages/Interact';

type Package = GetPackagesQuery['packages'][0];

export const InteractTab: FC<{ name: string }> = ({ name }) => {
  const { data } = useQuery<GetPackageQuery, GetPackageQueryVariables>(
    GET_PACKAGE,
    {
      variables: { name },
    }
  );

  const [pkg, setPackage] = useState<Package | null>(null);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  return (
    <Flex flexDirection="column" width="100%">
      {pkg ? (
        <Container maxW="container.xl">
          <Interact pkg={pkg} />
        </Container>
      ) : (
        <Spinner m="auto" />
      )}
    </Flex>
  );
};

export default InteractTab;
