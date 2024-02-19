'use client';

import { FC } from 'react';
import { Address } from 'viem';
import { Interact } from './Interact';

export const InteractPage: FC<{
  name: string;
  tag: string;
  variant: string;
  moduleName: string;
  contractName: string;
  contractAddress: Address;
}> = ({ name, tag, variant, moduleName, contractName, contractAddress }) => {
  return (
    <Interact
      name={name}
      tag={tag}
      variant={variant}
      moduleName={moduleName}
      contractName={contractName}
      contractAddress={contractAddress}
    ></Interact>
  );
};

export default InteractPage;
