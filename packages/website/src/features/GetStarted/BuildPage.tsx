'use client';
import React from 'react';
import { BuildWithCannon } from './BuildWithCannon';
import { SetupPanel } from './SetupSection/SetupPanel';

export const BuildPage = () => {
  return (
    <>
      <BuildWithCannon />
      <SetupPanel />
    </>
  );
};
