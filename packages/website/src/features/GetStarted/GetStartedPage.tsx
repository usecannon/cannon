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
      py={[0, 0, 8]}
    >
      <Box
        p={8}
        maxW="container.md"
        m="auto"
        background="black"
        border="1px solid"
        borderColor="gray.700"
        borderRadius="md"
      >
        <RunPackage />
      </Box>
    </Flex>
  );
};
