'use client';
import { Container, Heading } from '@chakra-ui/react';
import React from 'react';
import { RunPackage } from './RunPackage';

export const GetStartedPage = () => {
  return (
    <Container maxW="container.lg">
      <Heading as="h2" mb={8} textAlign="left">
        Get Started with Cannon
      </Heading>
      <RunPackage />
    </Container>
  );
};
