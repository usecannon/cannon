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
          letterSpacing="0.2px"
          mb={2.5}
        >
          Debug a Protocol
        </Heading>
        <Text
          pb={4}
          mb={4}
          borderBottom="1px solid"
          borderBottomColor="gray.800"
          fontSize="xl"
          color="gray.400"
        >
          Troubleshoot issues with your protocol during development and testing.
        </Text>
        <Text mb={4}>
          Protocol development can often involve frustrating errors that consist
          of inscrutable bytecode. Function calls staged to a Safe might not be
          legible. A dreaded <Code>0x</Code> error may be returned from a
          contract with no reason for the revert to be found.
        </Text>
        <Text mb={4}>
          Cannon can leverage data from packages to decode bytecode, generate
          human-readable stack traces, and send transactions to protocols.
        </Text>
        <Text mb={2}>
          To use the <Code>decode</Code>, <Code>trace</Code>, and{' '}
          <Code>interact</Code> commands, start by installing/upgrading Cannon:
        </Text>
        <Box mb={4}>
          <CommandPreview command="npm i -g @usecannon/cli" />
        </Box>
        <Heading size="md" mb={4} mt={6}>
          Decode
        </Heading>
        <Text mb={4}>
          You may encounter a hex string related to a protocol, but can’t tell
          what it is. Centralized services such as{' '}
          <Link isExternal href="https://openchain.xyz/tools/abi">
            ABI Tools
          </Link>{' '}
          or the{' '}
          <Link isExternal href="https://www.4byte.directory/">
            Ethereum Signature Database
          </Link>{' '}
          may be able to help if the relevant ABI has been uploaded there, but
          won’t be useful during protocol development.
        </Text>
        <Text mb={4}>
          You can pass hex data to Cannon’s <Code>decode</Code> command, along
          with the package name and a relevant chain ID, to get a human-readable
          version of function calls, function output, event data, and error
          data.
        </Text>
        <Text mb={2}>For example, you can decode this hex data ... :</Text>
        <Box mb={4}>
          <CommandPreview command="cannon decode TODO-EXAMPLE" />
        </Box>
        <Heading size="md" mb={4} mt={6}>
          Trace
        </Heading>
        <Text mb={4}>
          If you’d like to better understand a transaction—whether or not it
          resulted in an error—you can use Cannon’s <Code>trace</Code> command.
          This command accepts a transaction hash from a remote network or
          hex-encoded transaction data (as you might find in a gas estimation
          error).
        </Text>
        <Text mb={2}>For example, you can ... :</Text>
        <Box mb={4}>
          <CommandPreview command="cannon trace TODO-EXAMPLE" />
        </Box>
        <Text mb={4}>
          The command includes some options that allow you to simulate how a
          transaction (or transaction data) would execute under different
          circumstances: <Code>--block</Code>, <Code>--to</Code>,{' '}
          <Code>--from</Code>, and <Code>--value</Code>.{' '}
          <strong>
            Note that you must connect to an archive node (using the{' '}
            <Code>--provider-url</Code> option) to successfully simulate a call
            on a historical block.
          </strong>
        </Text>
        <Heading size="md" mb={4} mt={6}>
          Interact
        </Heading>
        <Text mb={4}>
          Similar to the{' '}
          <Link href="/packages/synthetix/latest/1-main/interact">
            interact tab
          </Link>{' '}
          in the package explorer, the CLI allows you to call view functions and
          send transactions to protocols in the command-line interface.
        </Text>
        <Text mb={2}>For example, you can ... :</Text>
        <Box mb={4}>
          <CommandPreview command="cannon interact synthetix --chain-id 1 --provider-url https://ethereum.publicnode.com" />
        </Box>
        <Text mb={4}>
          If you’d like to send transactions on-chain, you can include a private
          key using the <Code>--private-key</Code> option.
        </Text>
        <Text>
          For more information on the command-line interact, see the{' '}
          <Link href="/learn/cli">CLI section of the documentation</Link>.
        </Text>
      </Box>
    </Flex>
  );
};
