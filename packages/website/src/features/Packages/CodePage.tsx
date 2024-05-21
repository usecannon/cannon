'use client';

import { FC } from 'react';
import { Flex } from '@chakra-ui/react';
import { CodeExplorer } from '@/features/Packages/CodeExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Address } from 'viem';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPackage } from '@/helpers/api';
import { PackageReference } from '@usecannon/builder/src';

export const CodePage: FC<{
  name: string;
  tag: string;
  variant: string;
  moduleName?: string;
  contractAddress?: Address;
}> = ({ name, tag, variant, moduleName }) => {
  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = useQuery({
    queryKey: ['package', [`${name}:${tag}@${preset}/${chainId}`]],
    queryFn: getPackage,
  });

  const searchParams = useSearchParams();
  const source = searchParams.get('source') || '';
  const functionName = searchParams.get('function') || '';

  if (packagesQuery.isPending) {
    return <CustomSpinner m="auto" />;
  }

  return (
    <Flex flexDirection="column" width="100%" flex="1">
      <CodeExplorer
        name={name}
        pkg={packagesQuery.data.data}
        moduleName={moduleName}
        source={source}
        functionName={functionName}
      />
    </Flex>
  );
};

export default CodePage;
