'use client';
import { Container, Heading } from '@chakra-ui/react';
import React from 'react';
import { RunPackage } from './RunPackage';
import { BuildWithCannon } from './BuildWithCannon';
import { SetupPanel } from './SetupSection/SetupPanel';

export const GetStartedPage = () => {
  return (
    <Container maxW="container.lg">
      <Heading as="h2" mb={8} textAlign="left">
        Get Started with Cannon
      </Heading>
      <RunPackage />
      <BuildWithCannon />
      <SetupPanel />
    </Container>
  );
};
