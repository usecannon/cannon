'use client';
import { useTheme, Flex, Box, Heading, Text, Link } from '@chakra-ui/react';
import React from 'react';
import { CommandPreview } from '@/components/CommandPreview';

export const DebugPage = () => {
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
          Debugging your Contracts with Cannon: What to do when things go wrong
        </Heading>
        <Text mb={4}>
          We have all been there. Our production app is emitting a strange hex
          error, but our wallet wasn’t able to explain the actual cause. Worse,
          the error could be the dreaded `0x` (aka an error with no revert
          reason)! Or perhaps you have a transaction on gnosis safe, but its
          getting sent cross chain or through a proxy of some sort, so the
          function call cant be verified because its obscured.
        </Text>
        <Text mb={4}>
          Many tools have been built over the years to solve these problems.
          Since Cannon is effectively a package manager for protocol
          deployments, it can also assist with errors decoding of unknown data.
          This guide will show a few examples of how to use Cannon to explain
          errors, get stack traces, and gather other sorts of useful data you
          would want when helping a user. The best part: Cannon does this with{' '}
          <i>no centralized data providers</i>.
        </Text>
        <Heading size="md" mb={4} mt={6}>
          Decoding any Data
        </Heading>
        <Text mb={4}>
          If you havent already, you should install/upgrade Cannon:
        </Text>
        <Box mb={4}>
          <CommandPreview command="npm i -g @usecannon/cli" />
        </Box>
        <Text mb={4}>
          For this guide we will use the{' '}
          <Link href="https://usecannon.com/packages/synthetix">synthetix</Link>
          package as an example. Of course, you can substitute these commands
          for any other package.
        </Text>
        <Text mb={4}>
          Lets have cannon explain what the hex `0x` means. To do this, we can
          use the `cannon decode` utility. For exmaple:
        </Text>
        <Box mb={4}>
          <CommandPreview command="cannon decode synthetix 0x" />
          Command Output
        </Box>
        <Text mb={4}>
          From this output, in a few moments we can see that . Cannon determined
          this by resolving the `synthetix` package from the registry, and then
          downloaded the contract ABIs from IPFS.
        </Text>
        <Text mb={4}>
          This works for function definitions, also. For example, lets figure
          out what this giant call is actually doing:
        </Text>
        <Box mb={4}>
          <CommandPreview command="cannon decode synthetix 0x" />
          Command Output
        </Box>
        <Heading size="md" mb={4} mt={6}>
          Getting a Stack Trace
        </Heading>
        <Text mb={4}>
          Sometimes just knowing what the error is doesn’t cut it, or perhaps
          the error we are looking for is being emitted by a contract not inside
          of Cannon. Luckely, Cannon includes a tool dedicted to ad-hoc
          debugging of live-network transactions, and it works for any package
          deployed with Cannon.
        </Text>
        <Text mb={4}>
          We will use the cannon cli to understand the reason for why an error
          occurs for a particular transaction. First, start the cli on the
          cannon package for mainnet:
        </Text>
        <Box mb={4}>
          <CommandPreview command="cannon synthetix --chain-id 1 --provider-url https://ethereum.publicnode.com --impersonate 0x6cd3f878852769e04A723A5f66CA7DD4d9E38A6C" />
          Command Output
        </Box>
        <Text mb={4}>
          If you are running Frame, `--provider-url` is not required.
        </Text>
        <Text mb={4}>
          The address `0x6cd3f878852769e04A723A5f66CA7DD4d9E38A6C` is the
          Synthetix Dao, which is owner of the Synthetix contracts. Any address
          can be put in this field, as needed.
        </Text>
      </Box>
    </Flex>
  );
};
