'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { Container, Flex } from '@chakra-ui/react';
import { Interact } from '@/features/Packages/Interact';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';

export const InteractTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const { data } = useQueryCannonSubgraphData<any, any>(GET_PACKAGE, {
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
      {currentVariant ? (
        <Container maxW="container.xl" my={8}>
          <Interact variant={currentVariant} />
        </Container>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
};

export default InteractTab;
