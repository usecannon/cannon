'use client';

import { FC } from 'react';
import { Flex } from '@chakra-ui/react';
import { CodeExplorer } from '@/features/Packages/CodeExplorer';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Address } from 'viem';
import { useRouter } from 'next/router';
import { PackageReference } from '@usecannon/builder';
import { usePackageByRef } from '@/hooks/api/usePackage';

export const CodePage: FC<{
  name: string;
  tag: string;
  variant: string;
  moduleName?: string;
  contractAddress?: Address;
}> = ({ name, tag, variant, moduleName }) => {
  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const searchParams = useRouter().query;
  const source = (searchParams.source as string) || '';
  const functionName = (searchParams.function as string) || '';

  if (packagesQuery.isPending) {
    return <CustomSpinner m="auto" />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <Flex flexDirection="column" width="100%" flex="1">
      <CodeExplorer
        name={name}
        pkg={packagesQuery.data}
        moduleName={moduleName}
        source={source}
        functionName={functionName}
      />
    </Flex>
  );
};

export default CodePage;
