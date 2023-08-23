'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { Flex, Container } from '@chakra-ui/react';
import { CodeExplorer } from '@/features/Packages/CodeExplorer';
import UnderConstruction from './UnderConstruction';
import { CustomSpinner } from '@/components/CustomSpinner';

export const CodeTab: FC<{ name: string; tag: string; variant: string }> = ({
  name,
  tag,
  variant,
}) => {
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
        <Container maxW="container.xl">
          <CodeExplorer variant={currentVariant} />
        </Container>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
};

export default CodeTab;
