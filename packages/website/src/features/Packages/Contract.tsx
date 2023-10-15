import React, { FC } from 'react';
import { Abi as AbiType } from 'abitype';
import { ChainArtifacts } from '@usecannon/builder';
import { Box, Code, Flex, Heading } from '@chakra-ui/react';
import { Abi } from '@/features/Packages/Abi';

export const Contract: FC<{
  title: string;
  address: string;
  abi: AbiType;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ title, address, abi, cannonOutputs, chainId }) => {
  return (
    <Box
      mb="4"
      borderRadius="4px"
      border="1px solid rgba(255,255,255,0.2)"
      bg="black"
    >
      <Flex alignItems="center" p={4}>
        <Heading mb="1" size="md" display="inline-block">
          {title}
        </Heading>
        <Flex ml="auto" gap={1} alignItems="center" cursor="pointer">
          <Code display="inline" bg="transparent" color="gray.200">
            {address}
          </Code>
        </Flex>
      </Flex>
      <Abi
        abi={abi}
        address={address}
        cannonOutputs={cannonOutputs}
        chainId={chainId}
      />
    </Box>
  );
};
