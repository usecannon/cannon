'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import {
  GetPackageQuery,
  GetPackageQueryVariables,
  GetPackagesQuery,
} from '@/types/graphql/graphql';
import { useQuery } from '@apollo/client';
import { Flex, Spinner, Container } from '@chakra-ui/react';
import { DeploymentExplorer } from '@/features/Packages/DeploymentExplorer';

type Package = GetPackagesQuery['packages'][0];

export const DeploymentTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const { data } = useQuery<GetPackageQuery, GetPackageQueryVariables>(
    GET_PACKAGE,
    {
      variables: { name },
    }
  );

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const [pkg, setPackage] = useState<Package | null>(null);

  const currentVariant = pkg?.variants.find(
    (v) => v.name === variant && v.tag.name === tag
  );

  return (
    <Flex flexDirection="column" width="100%">
      {currentVariant ? (
        <Container maxW="container.xl">
          <DeploymentExplorer variant={currentVariant} />
        </Container>
      ) : (
        <Spinner m="auto" />
      )}
    </Flex>
  );
};

export default DeploymentTab;
