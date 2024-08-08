'use client';
import { Box, Heading, Text, Link, Code } from '@chakra-ui/react';
import { Image } from '@chakra-ui/react';
import React from 'react';
import { CommandPreview } from '@/components/CommandPreview';

export const DebugPage = () => {
  return (
    <>
      <Heading
        as="h2"
        size="lg"
        fontWeight={600}
        letterSpacing="0.2px"
        mb={2.5}
      >
        Debugging Tips
      </Heading>
      <Text
        pb={6}
        mb={6}
        borderBottom="1px solid"
        borderBottomColor="gray.600"
        fontSize="xl"
        color="gray.400"
      >
        Troubleshoot issues with your protocol during development and testing.
      </Text>
      <Text mb={4}>
        Protocol development can often involve frustrating errors that consist
        of inscrutable bytecode. Function calls staged to a Safe might not be
        legible. A dreaded <Code>0x</Code> error may be returned from a contract
        with no reason for the revert to be found.
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
      <Heading size="md" mb={3} mt={9}>
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
        may be able to help, but won’t be useful during protocol development or
        if the relevant ABI hasn’t been uploaded there.
      </Text>
      <Text mb={4}>
        You can pass hex data to Cannon’s <Code>decode</Code> command, along
        with the package name and a relevant chain ID, to get a human-readable
        version of function calls, function output, event data, and error data.
      </Text>
      <Text mb={2}>For example, the following command decodes error data:</Text>
      <Box mb={4}>
        <CommandPreview command="cannon decode synthetix-omnibus --chain-id 84531 --preset competition 0xb87daa32000000000000000000000000000000000000000000000000000000006502188b00000000000000000000000000000000000000000000000000000000650218190000000000000000000000000000000000000000000000000000000065021855" />
      </Box>
      <Box mb={4} width="100%" overflowX="auto">
        <Image
          height="32px"
          width="1538px"
          maxWidth="1538px"
          borderRadius="sm"
          src="/images/guide_debug_1.png"
          alt="first debug guide"
        />
      </Box>
      <Heading size="md" mb={3} mt={9}>
        Trace
      </Heading>
      <Text mb={4}>
        If you’d like to better understand the execution of a
        transaction—whether or not it resulted in an error—you can use Cannon’s{' '}
        <Code>trace</Code> command. This command accepts a transaction hash from
        a remote network or hex-encoded transaction data (as you might find in a
        gas estimation error).
      </Text>
      <Text mb={4}>
        The command includes some options that allow you to simulate how a
        transaction (or transaction data) would execute under different
        circumstances: <Code>--block-number</Code>, <Code>--to</Code>,{' '}
        <Code>--from</Code>, and <Code>--value</Code>.{' '}
        <strong>
          Note that you must connect to an archive node (using the{' '}
          <Code>--rpc-url</Code> option) to successfully simulate a call on a
          historical block.
        </strong>
      </Text>
      <Text mb={2}>
        For example, the following command provides a full stack trace for
        retrieving the debt associated with a pool’s vault in Synthetix V3:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon trace --chain-id 10 synthetix-omnibus 0x2fb8ff2400000000000000000000000000000000000000000000000000000000000000010000000000000000000000008700daec35af8ff88c16bdf0418774cb3d7599b4 --to 0xffffffaEff0B96Ea8e4f94b2253f31abdD875847 --rpc-url https://optimism.publicnode.com" />
      </Box>
      <Box mb={4} width="100%" overflowX="auto">
        <Image
          height="250px"
          width="884px"
          maxWidth="884px"
          borderRadius="sm"
          src="/images/guide_debug_2.png"
          alt="second debug guide"
        />
      </Box>
      <Heading size="md" mb={3} mt={9}>
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
      <Text mb={2}>
        For example, you can use the interact tool to call functions on
        Synthetix V3:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon interact synthetix --chain-id 1 --rpc-url https://ethereum.publicnode.com" />
      </Box>
      <Text mb={4}>
        If you’d like to send transactions, you can use{' '}
        <Link href="https://frame.sh/" isExternal>
          Frame
        </Link>{' '}
        or include a private key using either an environment variable{' '}
        <Code>CANNON_PRIVATE_KEY</Code> or the <Code>--private-key</Code>{' '}
        option.
      </Text>
      <Text>
        For more information on the command-line interact command, see the{' '}
        <Link href="/learn/cli">CLI section of the documentation</Link>.
      </Text>
    </>
  );
};
