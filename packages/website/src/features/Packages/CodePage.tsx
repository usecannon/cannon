'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import { Flex } from '@chakra-ui/react';
import { CodeExplorer } from '@/features/Packages/CodeExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Address } from 'viem';
import { useSearchParams } from 'next/navigation';

export const CodePage: FC<{
  name: string;
  tag: string;
  variant: string;
  moduleName: string;
  contractAddress: Address;
}> = ({ name, tag, variant, moduleName }) => {
  const { data } = useQueryCannonSubgraphData<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  const searchParams = useSearchParams();
  const source = searchParams.get('source') || '';
  const functionName = searchParams.get('function') || '';

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const [pkg, setPackage] = useState<any | null>(null);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

  return (
    <Flex flexDirection="column" width="100%" flex="1">
      {currentVariant ? (
        <CodeExplorer
          name={name}
          variant={currentVariant}
          moduleName={moduleName}
          source={source}
          functionName={functionName}
        />
      ) : (
        <CustomSpinner m="auto" />
      )}
    </Flex>
  );
};

export default CodePage;
