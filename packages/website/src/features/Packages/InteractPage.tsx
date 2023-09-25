'use client';

import { FC } from 'react';
import { InteractTabPrototype } from './Interact';

export const InteractPage: FC<{
  contractAddress: string;
}> = ({ contractAddress }) => {
  return (
    <InteractTabPrototype
      contractAddress={contractAddress}
    ></InteractTabPrototype>
  );
};

export default InteractPage;
