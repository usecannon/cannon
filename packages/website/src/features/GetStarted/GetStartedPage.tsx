'use client';
import { Flex, Box, useTheme } from '@chakra-ui/react';
import React from 'react';
import { RunPackage } from './RunPackage';

export const GetStartedPage = () => {
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
        <RunPackage />
      </Box>
    </Flex>
  );
};
