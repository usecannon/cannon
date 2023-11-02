'use client';
import { useTheme, Flex, Box } from '@chakra-ui/react';
import React from 'react';
import { BuildWithCannon } from './BuildWithCannon';
import { SetupPanel } from './SetupSection/SetupPanel';

export const BuildPage = () => {
  const theme = useTheme();

  return (
    <Flex
      background={theme.gradients.dark}
      backgroundAttachment="fixed"
      flex="1"
      py={[4, 4, 8]}
      p={4}
    >
      <Box
        overflowX="hidden"
        p={8}
        maxW="container.md"
        m="auto"
        background="black"
        border="1px solid"
        borderColor="gray.800"
        borderRadius="md"
      >
        <BuildWithCannon />
        <SetupPanel />
      </Box>
    </Flex>
  );
};
