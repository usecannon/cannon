'use client';
import {
  useTheme,
  Flex,
  Box,
  Heading,
  Text,
  Link,
  Code,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import React from 'react';
import { CodePreview } from '@/components/CodePreview';
import { CommandPreview } from '@/components/CommandPreview';

const code1 = `name = "sample-router-project"
version = "0.1"
description = "Sample Router Project"

[contract.counter]
artifact = "Counter"

[contract.another_counter]
artifact = "AnotherCounter"

[router.generate_router]
contracts = []
depends = ["contract.counter", "contract.another_counter"]`;

const code2 = `[provision.upgradeable_proxy]
...
depends = ["router.generate_router"]`;

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
          To overcome this constraint, Cannon includes a plug-in for the{' '}
          <Link
            isExternal
            href="https://github.com/synthetixio/synthetix-router"
          >
            Synthetix Router
          </Link>
          . This can be used by defining a <Code>router</Code> step in
          Cannonfiles. This accepts an array of contracts and automatically
          generates a router contract which will delegate calls to them.
        </Text>
        <Heading size="md" mb={4} mt={6}>
          Create a Router
        </Heading>
        <Text mb={4}>Start by installing Cannon, if you haven't already:</Text>
        <Box mb={4}>
          <CommandPreview command="npm i -g @usecannon/cli" />
        </Box>
        <Text mb={4}>
          Also make sure you have an{' '}
          <Link isExternal href="https://docs.ipfs.tech/install/ipfs-desktop/">
            IPFS node
          </Link>{' '}
          running locally. Then set up a new{' '}
          <Link href="https://github.com/foundry-rs/foundry" isExternal>
            Foundry
          </Link>{' '}
          project:
        </Text>
        <Box mb={4}>
          <CommandPreview command="forge init" />
        </Box>
        <Text mb={4}>
          This project will include a <Code>Counter.sol</Code> contract by
          default. Duplicate this contract, rename it, and alter the function
          names in it. For this example, we’ll assume you’ve rename the file and
          contract to <Code>AnotherCounter</Code>.
        </Text>
        <Text mb={4}>
          Create <Code>cannonfile.toml</Code> that deploys the two contracts and
          a router:
        </Text>
        <Box mb={4}>
          <CodePreview code={code1} language="toml" />
        </Box>
        <Text mb={4}>Build the Cannonfile:</Text>
        <Box mb={4}>
          <CommandPreview command="cannon build" />
        </Box>
        <Text mb={4}>
          Run it. (By default, Cannon runs packages from the{' '}
          <Link as={NextLink} href="/search">
            package manager
          </Link>
          . Here, we add the <Code>--registry-priority local</Code> flag to
          ensure we're using the version of this package that you just built,
          regardless of what others have published.)
        </Text>
        <Box mb={4}>
          <CommandPreview command="cannon sample-router-project --registry-priority local" />
        </Box>
        <Text mb={4}>
          You'll see that the router contact has both contracts available.
          Always remember to interact with the router contract. Warning about
          storage layout.
        </Text>
        IMAGE HERE
        <Heading size="md" mb={4} mt={6}>
          Add Upgradability
        </Heading>
        <Text mb={4}>
          We can also deploy a standard{' '}
          <Link as={NextLink} href="/packages/uups-proxy">
            UUPS Proxy
          </Link>{' '}
          pointing at the router, such that the resulting protocol can be
          upgradeable. Add the following step to the Cannonfile:
        </Text>
        <Box mb={4}>
          <CodePreview code={code2} language="toml" />
        </Box>
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
