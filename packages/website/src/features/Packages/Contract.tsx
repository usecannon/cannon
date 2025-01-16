import { Abi } from '@/features/Packages/Abi';
import { ChainArtifacts } from '@usecannon/builder';
import { Abi as AbiType } from 'abitype';
import React, { FC } from 'react';
import { Address } from 'viem';

export const Contract: FC<{
  title: string;
  address: Address;
  abi: AbiType;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ title, address, abi, cannonOutputs, chainId }) => {
  return (
    <div className="mb-4 rounded border border-border bg-background">
      <div className="flex items-center p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="ml-auto flex items-center gap-1 cursor-pointer">
          <code className="bg-transparent text-muted-foreground">
            {address}
          </code>
        </div>
      </div>
      <Abi
        abi={abi}
        address={address}
        cannonOutputs={cannonOutputs}
        chainId={chainId}
      />
    </div>
  );
};
