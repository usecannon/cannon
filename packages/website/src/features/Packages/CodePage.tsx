'use client';

import { FC } from 'react';
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
    return <CustomSpinner />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <div className="flex flex-col w-full flex-1">
      <CodeExplorer
        name={name}
        pkg={packagesQuery.data}
        moduleName={moduleName}
        source={source}
        functionName={functionName}
      />
    </div>
  );
};

export default CodePage;
