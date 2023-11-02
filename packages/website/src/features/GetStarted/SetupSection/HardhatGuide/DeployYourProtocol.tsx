import { Box, Heading, Text } from '@chakra-ui/react';
import { CommandPreview } from '@/components/CommandPreview';
import NextLink from 'next/link';
import { Link } from '@chakra-ui/next-js';
import { Link as ChakraLink } from '@chakra-ui/react';
import { links } from '@/constants/links';

export const DeployYourProtocol = () => {
  return (
    <>
      <Heading size="md" mb={3} mt={8}>
        Deploy Your Protocol
      </Heading>
      <Text mb={4}>
        Deploying is just building on a remote network! Be sure to use a network
        name that you&apos;ve&nbsp;
        <ChakraLink
          isExternal
          href="https://hardhat.org/tutorial/deploying-to-a-live-network#deploying-to-remote-networks"
        >
          specified in your Hardhat Configuration file
        </ChakraLink>
        .
      </Text>
      <Box mb={4}>
        <CommandPreview command="npx hardhat cannon:build --network REPLACE_WITH_NETWORK_NAME" />
      </Box>
      <Text mb={4}>
        Set up the&nbsp;
        <ChakraLink
          isExternal
          href="https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan"
        >
          and verify your project&apos;s contracts:
        </ChakraLink>
        :
      </Text>
      <Box mb={4}>
        <CommandPreview command="npx hardhat cannon:verify" />
      </Box>
      <Text mb={4}>
        Finally, publish your package on the&nbsp;
        <Link as={NextLink} href={links.EXPLORE}>
          Cannon registry
        </Link>
        :
      </Text>
      <Box mb={4}>
        <CommandPreview command="npx hardhat cannon:publish --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET" />
      </Box>
    </>
  );
};
