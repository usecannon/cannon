import { CommandPreview } from '@/components/CommandPreview';
import { links } from '@/constants/links';
import {
  Heading,
  Text,
  Box,
  Link,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
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
      <Alert status="info" mb={4} bg="gray.800">
        <AlertIcon />
        <Box>
          <AlertTitle>Install Forge before proceeding</AlertTitle>
          <AlertDescription>
            The steps in this guide require Anvil, which is included as part of
            Forge. If you do not have Forge installed, you can{' '}
            <Link
              href="https://book.getfoundry.sh/getting-started/installation"
              isExternal
            >
              follow their installation guide
            </Link>
            {'.'}
          </AlertDescription>
        </Box>
      </Alert>
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
      <Heading size="md" mb={3} mt={8}>
        Troubleshooting IPFS errors
      </Heading>
      <Text mb={4}>
        Public IPFS nodes are sometimes not responsive, in which case you may
        receive an error similar to:
      </Text>
      <Box mb={4}>
        <CommandPreview command='Error: could not download cannon package data from "QmdKn7BRDd3Ugv64DcAK7mnPhyNe3PkhHRCTc34eBgExLb": AxiosError: Request failed with status code 504' />
      </Box>
      <Text mb={4}>
        You can resolve this by adding a custom IPFS url to your configuration.
        run the following command to setup your IPFS configuration:
        <Box mb={4}>
          <CommandPreview command="cannon setup" />
        </Box>
        Note that it prompts for two IPFS urls, the publish IPFS url and the
        build IPFS url. They are respectively used when publishing to the
        registry and building a package. If you are in development and simply
        wish to test things try running a local IPFS node.
      </Text>

      <Text mb={4}>
        To do this, firstly{' '}
        <Link href="https://docs.ipfs.tech/install/#get-started" isExternal>
          install IPFS
        </Link>
        {', '}
        To start IPFS with IPFS desktop simply open the app, to start a local
        IPFS server using the the IPFS cli run:
        <Box mb={4}>
          <CommandPreview command="ipfs daemon" />
        </Box>
      </Text>
      <Text mb={4}>
        Then run the cannon setup and when prompted, enter the following URI for
        both the publishing ipfs endpoint and building ipfs endpoint:
      </Text>
      <Box mb={4}>
        <CommandPreview command="http://127.0.0.1:5001" />
      </Box>
      <Text mb={4}>Running cannon commands should now succeed.</Text>
    </>
  );
};
