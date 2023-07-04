import { CommandPreview } from '@/components/CommandPreview';
import { externalLinks } from '@/constants/externalLinks';
import { links } from '@/constants/links';
import { Heading, Text, Box, Link } from '@chakra-ui/react';
import NextLink from 'next/link';

export const RunPackage = () => {
  return (
    <>
      <Heading as="h3" fontSize="2xl" mb={4}>
        📦 Run a Package
      </Heading>
      <Text mb={4}>Start by installing Cannon with the following command:</Text>
      <Box mb={4}>
        <CommandPreview command="npm install -g @usecannon/cli" />
      </Box>
      <Text mb={4}>
        Now you can run any package available on&nbsp;
        <Link href={links.EXPLORE} as={NextLink} textDecoration="underline">
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
          href={externalLinks.GITHUB_ANVIL}
          as={NextLink}
          textDecoration="underline"
        >
          Anvil node
        </Link>
        &nbsp; on port 8545 with a deployment of Synthetix V3 for local testing
        and development. Press i to interact with the contracts directly in the
        command-line interface.
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
        on remote networks. See the&nbsp;
        <Link
          href={links.TECHNICAL_REF}
          as={NextLink}
          textDecoration="underline"
        >
          Technical Reference
        </Link>
        &nbsp;for more information.
      </Text>
    </>
  );
};
