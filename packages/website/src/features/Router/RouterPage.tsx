'use client';
import { useTheme, Flex, Box, Heading, Text } from '@chakra-ui/react';
import React from 'react';

export const RouterPage = () => {
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
        <Heading
          as="h2"
          size="lg"
          fontWeight={600}
          pb={4}
          mb={4}
          borderBottom="1px solid"
          borderBottomColor="gray.800"
          letterSpacing="0.2px"
        >
          Use a Synthetix Router
        </Heading>
        <Text mb={4}>
          There is a limit to the size of smart contracts deployed on EVM
          blockchains. This can create complications during the development of
          protocols, where an engineer may want an arbitrary amount of code to
          be executable at a single address.
        </Text>
        <Text mb={4}>
          To overcome this constraint, Cannon includes a plug-in for the
          [Synthetix Router](). This enables a `router` step in Cannonfiles
          which accepts an array of contracts and generates a router contract
          which will delegate calls to them.
        </Text>
        <Text mb={4}>
          For example, you can install Cannon (if you haven't already) and set
          up a new Foundry project:
        </Text>
        EXAMPLE
        <Text mb={4}>Add two contracts...</Text>
        <Text mb={4}>
          Create a Cannonfile that deploys the two contracts and router
        </Text>
        <Text mb={4}>Now build the cannonfile</Text>
        <Text mb={4}>You can run this package (use local registry)</Text>
        <Text mb={4}>
          You'll see that the router contact has both contracts available.
          Always remember to interact with the router contract. Warning about
          storage layout.
        </Text>
        <Text mb={4}>
          We can also deploy a standard [UUPS Proxy]() pointing at the router,
          such that the resulting protocol can be upgradeable—until proxy
          ownership is revoked and the protocol is made immutable.
        </Text>
        PROVISION UUPSProxy
        <Text mb={4}>
          Now, if you alter one of your contracts, Cannon will detect and
          generate a new router, and upgrade the proxy to point at the new one.
        </Text>
        <Text mb={4}>Either rebuild, or "upgrade from"</Text>
        <Text mb={4}>
          When you've built a protocol you'd like others to integrate with,
          publish package
        </Text>
        <Text mb={4}>
          If it's owned by a safe, you can use the deploy app. Ownership of the
          proxy may be revoked, and the protocol made immutable.
        </Text>
      </Box>
    </Flex>
  );
};
