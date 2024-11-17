import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';
import { Heading, Text, Box, Link, Kbd } from '@chakra-ui/react';
import NextLink from 'next/link';

export const RunPackage = () => {
  return (
    <>
      <Heading
        as="h2"
        size="lg"
        fontWeight={600}
        letterSpacing="0.2px"
        mb={2.5}
      >
        Run a Cannon Package
      </Heading>
      <Text
        pb={4}
        mb={4}
        borderBottom="1px solid"
        borderBottomColor="gray.600"
        fontSize="xl"
        color="gray.400"
      >
        Run a package from the explorer on a local node in seconds
      </Text>
      <Text mb={4}>
        <Link
          isExternal
          href="https://book.getfoundry.sh/getting-started/installation"
        >
          Install Foundry
        </Link>{' '}
        if you haven’t already.
      </Text>
      <Box mb={4}>
        <CommandPreview command="curl -L https://foundry.paradigm.xyz | bash" />
      </Box>
      <Text mb={4}>
        You may need to restart your terminal before running the next command:
      </Text>
      <Box mb={4}>
        <CommandPreview command="foundryup" />
      </Box>
      <Text mb={4}>
        Install Cannon’s <Link href={links.CLI}>command-line interface</Link>.
      </Text>
      <Box mb={4}>
        <CommandPreview command="npm install -g @usecannon/cli" />
      </Box>
      <Text mb={4}>
        Run any package from{' '}
        <Link href={links.EXPLORE} as={NextLink}>
          the explorer
        </Link>{' '}
        with a <em>Cannon</em> deployment. This will start an&nbsp;
        <Link
          href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil"
          isExternal
        >
          Anvil node
        </Link>{' '}
        with{' '}
        <Link isExternal href="/packages/greeter/latest/13370-main">
          a deployment of the greeter package
        </Link>{' '}
        for local testing and development:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon greeter" />
      </Box>
      <Text mb={4}>
        Export the contract addresses and ABIs as a folder of JSON files. For
        example:
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon inspect greeter --write-deployments ./deployments" />
      </Box>
      <Text mb={4}>
        The command-line tool has a lot of additional functionality, including
        the ability to run packages on local forks and interact with deployments
        on remote networks. For example, press the <Kbd>I</Kbd> key after
        running a package to interact directly with the contracts using the CLI.
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
