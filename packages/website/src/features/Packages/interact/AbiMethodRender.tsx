import { ChainArtifacts } from '@usecannon/builder';
import { Abi, AbiFunction } from 'abitype';
import React, { FC } from 'react';
import { Address } from 'viem';
import { AbiMethodRenderCollapsible } from '@/features/Packages/interact/AbiMethodRenderCollapsible';
import { AbiMethodRenderContent } from '@/features/Packages/interact/AbiMethodRenderContent';

export const AbiMethodRender: FC<{
  selected?: boolean;
  f: AbiFunction;
  abi: Abi;
  address: Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractName?: string;
  onDrawerOpen?: () => void;
  collapsible?: boolean;
  showFunctionSelector: boolean;
  packageUrl?: string;
  isDrawerOpen?: boolean;
}> = ({
  selected,
  f,
  abi,
  address,
  chainId,
  contractName,
  onDrawerOpen,
  showFunctionSelector,
  packageUrl,
  isDrawerOpen,
}) => {
  const anchor = `#selector-${f.name}`;

  return (
    <AbiMethodRenderCollapsible
      f={f}
      content={
        <AbiMethodRenderContent
          f={f}
          abi={abi}
          address={address}
          chainId={chainId}
          contractName={contractName}
          onDrawerOpen={onDrawerOpen}
          showFunctionSelector={showFunctionSelector}
          packageUrl={packageUrl}
          isDrawerOpen={isDrawerOpen}
        />
      }
      anchor={anchor}
      selected={selected}
      defaultOpen={selected}
    />
  );
};
