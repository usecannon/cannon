'use client';

import { FC } from 'react';
import { Interact } from './Interact';

export const InteractPage: FC<{
  name: string;
  tag: string;
  variant: string;
  contractAddress: string;
}> = ({ name, tag, variant, contractAddress }) => {
  return (
    <Interact
      name={name}
      tag={tag}
      variant={variant}
      contractAddress={contractAddress}
    ></Interact>
  );
};

export default InteractPage;
