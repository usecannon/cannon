'use client';

import { FC } from 'react';
import { InteractTabPrototype } from './Interact';

export const InteractPage: FC<{
  name: string;
  tag: string;
  variant: string;
  contractAddress: string;
}> = ({ name, tag, variant, contractAddress }) => {
  return (
    <InteractTabPrototype
      name={name}
      tag={tag}
      variant={variant}
      contractAddress={contractAddress}
    ></InteractTabPrototype>
  );
};

export default InteractPage;
