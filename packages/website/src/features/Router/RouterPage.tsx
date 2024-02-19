'use client';
import {
  useTheme,
  Flex,
  Box,
  Heading,
  Text,
  Link,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
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
]`;

const code2 = `[setting.admin]
defaultValue = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

[provision.proxy]
source = "transparent-upgradable-proxy:4.9.3"
options.admin = "<%= settings.admin %>"
options.implementation = "<%= contracts.Router.address %>"
options.abi = "<%= JSON.stringify(contracts.Router.abi) %>"`;

export const RouterPage = () => {
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
        <Heading
          as="h2"
          size="lg"
          fontWeight={600}
          letterSpacing="0.2px"
          mb={2.5}
        >
          Deploy a Router
        </Heading>
        <Text
          pb={4}
          mb={4}
          borderBottom="1px solid"
          borderBottomColor="gray.800"
          fontSize="xl"
          color="gray.400"
        >
          Build an upgradable protocol of any size with Synthetix’s Router
          plug-in
        </Text>
        <Text mb={4}>
          There is a limit to the size of smart contracts deployed on EVM
          blockchains. This can create complications during the development of
          protocols, where engineers may want an arbitrary amount of code to be
          executable at a single address.
        </Text>
        <Text mb={4}>
          To avoid the need to manage complex inheritance and dependency
          structures, Cannon includes{' '}
          <Link
            isExternal
            href="https://github.com/synthetixio/synthetix-router"
          >
            Synthetix’s Router plug-in
          </Link>
          . This can be used by defining a <Code>router</Code> step in
          Cannonfiles. This accepts an array of contracts and automatically
          generates a router contract which will delegate calls to them. For a
          more technical explanation of the router, review its{' '}
          <Link
            isExternal
            href="https://github.com/synthetixio/synthetix-router#readme"
          >
            README
          </Link>
          .
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
          Then set up a new{' '}
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
          names in it. For this example, we’ll assume you’ve renamed the file
          and contract to <Code>AnotherCounter</Code>.
        </Text>
        <Text mb={4}>
          Create <Code>cannonfile.toml</Code> that deploys the two contracts and
          a router:
        </Text>
        <Box mb={4}>
          <CodePreview code={code1} language="ini" />
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
          . Here, we add the <Code>--registry-priority local</Code> option to
          ensure we’re using the version of this package that you just built,
          regardless of what others have published.)
        </Text>
        <Box mb={4}>
          <CommandPreview command="cannon sample-router-project --registry-priority local" />
        </Box>
        <Text mb={4}>
          Press <Code>i</Code> to interact with the contracts in this project.
          You’ll see that the router contract exposes the functions from both
          contracts.
        </Text>
        <Alert status="info" mb={4} bg="gray.800">
          <AlertIcon />
          <Box>
            <AlertTitle>Interact with the router contract</AlertTitle>
            <AlertDescription>
              When using this pattern, users should interact with the router and
              not the dependent contracts directly.
            </AlertDescription>
          </Box>
        </Alert>

        <Heading size="md" mb={4} mt={6}>
          Add an Upgradability Proxy
        </Heading>
        <Text mb={4}>
          We can also deploy a{' '}
          <Link as={NextLink} href="/packages/transparent-upgradable-proxy">
            transparent upgradeable proxy
          </Link>{' '}
          pointing at the router, making this protocol upgradeable. In the
          Cannonfile, add a setting for the admin (which will be allowed to
          upgrade the proxy) and then provision the package which includes{' '}
          <Link
            href="https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/transparent/TransparentUpgradeableProxy.sol"
            isExternal
          >
            the proxy contract
          </Link>
          :
        </Text>
        <Box mb={4}>
          <CodePreview code={code2} language="ini" />
        </Box>
        <Text mb={4}>
          If you alter one of your contracts, when building, Cannon will
          automatically detect this, generate a new router, and upgrade the
          proxy to point at it. (Old versions of the contracts aren’t included
          in the router, saving gas.) When building an upgrade, increase the
          version in your Cannonfile and use the <Code>--upgrade-from</Code>{' '}
          option to reference the package from your previous version.
        </Text>
        <Alert status="info" mb={4} bg="gray.800">
          <AlertIcon />
          <Box>
            <AlertTitle>Interact with the proxy contract</AlertTitle>
            <AlertDescription>
              When using this pattern, users should always interact with the
              proxy contract rather than the router contract.
            </AlertDescription>
          </Box>
        </Alert>

        <Heading size="md" mb={4} mt={6}>
          Avoid Storage Collisions
        </Heading>
        <Text mb={4}>
          Changing the storage layout in smart contracts can irreversibly
          corrupt protocol data. Thoroughly understand how to avoid{' '}
          <Link
            href="https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies"
            isExternal
          >
            storage collisions
          </Link>{' '}
          when upgrading. If you’re using Hardhat, check out the{' '}
          <Link
            href="https://github.com/Synthetixio/synthetix-v3/tree/main/utils/hardhat-storage"
            isExternal
          >
            hardhat-storage
          </Link>{' '}
          plug-in, which validates storage changes.
        </Text>

        <Text mb={4}>
          You can use libraries for executing with storage reads/writes to
          create an MVC-style architecture. See the{' '}
          <Link
            href="https://docs.synthetix.io/v/v3/for-developers/technical-architecture"
            isExternal
          >
            Synthetix V3 documentation
          </Link>{' '}
          for inspiration.
        </Text>

        <Divider my={4} />

        <Text>
          If the protocol is owned by a{' '}
          <Link isExternal href="https://safe.global/">
            Safe
          </Link>
          , you can use the{' '}
          <Link as={NextLink} href="/deploy">
            deployer
          </Link>{' '}
          to run upgrades. (
          <Link
            isExternal
            href="https://docs.safe.global/safe-smart-account/modules"
          >
            Safe Modules
          </Link>{' '}
          and{' '}
          <Link
            isExternal
            href="https://docs.safe.global/safe-smart-account/guards"
          >
            Safe Guards
          </Link>{' '}
          can be developed for additional on-chain, governance-related logic.)
          When your protocol no longer needs to be upgraded, it can be made
          immutable with a call to <Code>renounceOwnership</Code> on the proxy.
        </Text>
      </Box>
    </Flex>
  );
};
