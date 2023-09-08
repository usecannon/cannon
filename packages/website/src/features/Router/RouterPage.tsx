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

[contract.Counter]
artifact = "Counter"

[contract.AnotherCounter]
artifact = "AnotherCounter"

[router.Router]
contracts = [
  "Counter",
  "AnotherCounter",
]
depends = [
  "contract.Counter",
  "contract.AnotherCounter",
]`;

const code2 = `[setting.admin]
defaultValue = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

[provision.proxy]
source = "transparent-upgradable-proxy:4.9.3"
options.admin = "<%= settings.admin %>"
options.implementation = "<%= contracts.Router.address %>"
options.abi = "<%= contracts.Router.abi %>"
depends = ["router.Router"]`;

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
          protocols, where engineers may want an arbitrary amount of code to be
          executable at a single address.
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
        <Text mb={4}>
          In this guide, we’ll walk through{' '}
          <Link
            isExternal
            href="https://github.com/usecannon/cannon/tree/main/examples/router-architecture"
          >
            a simple example
          </Link>{' '}
          that uses the router and adds a transparent upgradable proxy.
        </Text>

        <Heading size="md" mb={4} mt={6}>
          Create a Router
        </Heading>
        <Text mb={4}>Start by installing/upgrading Cannon:</Text>
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
          Press <Code>i</Code> to interact with the contracts in this project.
          You'll see that the router contract exposes the functions from both
          contracts.{' '}
          <strong>
            Always remember to interact with the router contract, and not the
            dependent contracts directly.
          </strong>
        </Text>
        <Heading size="md" mb={4} mt={6}>
          Add Upgradability
        </Heading>
        <Text mb={4}>
          We can also deploy a{' '}
          <Link as={NextLink} href="/packages/transparent-upgradable-proxy">
            transparent upgradeable proxy
          </Link>{' '}
          pointing at the router, such that this protocol can be upgradeable. In
          the Cannonfile, add a setting for the admin (which will be allowed to
          upgrade the proxy) and then provision the package which includes the
          proxy contract:
        </Text>
        <Box mb={4}>
          <CodePreview code={code2} language="toml" />
        </Box>
        <Text mb={4}>
          If you alter one of your contracts, when building, Cannon will
          automatically detect this, generate a new router, and upgrade the
          proxy to point at it. When building an upgrade, use the{' '}
          <Code>--upgrade-from</Code> flag to reference your existing package.{' '}
          <strong>
            Remember to always call functions on the proxy rather than the
            router, and{' '}
            <Link
              href="https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies"
              isExternal
            >
              avoid storage collisions
            </Link>{' '}
            when upgrading.
          </strong>
        </Text>
        <Text>
          If the protocol is owned by a{' '}
          <Link isExternal href="https://safe.global/">
            Safe
          </Link>
          , you can use the{' '}
          <Link as={NextLink} href="/deploy">
            deployer
          </Link>{' '}
          to run upgrades. When your protocol no longer needs to be upgraded, it
          can be made immutable with a call to <Code>renounceOwnership</Code> on
          the proxy.
        </Text>
      </Box>
    </Flex>
  );
};
