'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { Container, Flex, Spinner } from '@chakra-ui/react';
import { Interact } from '@/features/Packages/Interact';
import UnderConstruction from './UnderConstruction';

export const InteractTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const { data } = useQuery<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const [pkg, setPackage] = useState<any | null>(null);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

  return (
    <Flex flexDirection="column" width="100%">
      <UnderConstruction />
      {currentVariant ? (
        <Container maxW="container.lg">
          <Interact variant={currentVariant} />
        </Container>
      ) : (
        <Spinner m="auto" />
      )}
    </Flex>
  );
};

export default InteractTab;
