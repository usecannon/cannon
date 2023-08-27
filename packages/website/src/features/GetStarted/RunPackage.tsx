import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';
import { Heading, Text, Box, Link } from '@chakra-ui/react';
import NextLink from 'next/link';

export const RunPackage = () => {
  return (
    <>
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
        Run a Cannon Package
      </Heading>
      <Text mb={4}>Start by installing Cannon with the following command:</Text>
      <Box mb={4}>
        <CommandPreview command="npm install -g @usecannon/cli" />
      </Box>
      <Text mb={4}>
        Now you can run any package available on&nbsp;
        <Link href={links.EXPLORE} as={NextLink}>
          the registry
        </Link>
        , like so:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon synthetix-sandbox" />
      </Box>
      <Text mb={4}>
        This will start an&nbsp;
        <Link
          href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil"
          isExternal
        >
          Anvil node
        </Link>
        &nbsp; on port 8545 with{' '}
        <Link
          isExternal
          href="https://github.com/synthetixio/synthetix-sandbox"
        >
          a deployment of Synthetix V3
        </Link>{' '}
        for local testing and development. Press i to interact with the
        contracts directly in the command-line interface.
      </Text>
      <Text mb={4}>
        You can use the inspect command to retrieve the contract addresses and
        ABIs. For example:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon inspect synthetix-sandbox --write-deployments ./deployments" />
      </Box>
      <Text mb={4}>
        The command-line tool has a lot of additional functionality, including
        the ability to run packages on local forks and interact with deployments
        on remote networks.{' '}
        <Link href={links.CLI} as={NextLink}>
          Learn more
        </Link>
      </Text>

      <Text>
        Next,{' '}
        <Link href={links.BUILD} as={NextLink}>
          build a protocol and add your own package to the registry
        </Link>
        .
      </Text>
    </>
  );
};
