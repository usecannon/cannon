import { Box, Heading, Text } from '@chakra-ui/react';
import { CommandPreview } from '@/components/CommandPreview';
import { externalLinks } from '@/constants/externalLinks';
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
      <Text mb={4}>Deploying is just building on a remote network!</Text>
      <Box mb={4}>
        <CommandPreview command="cannon build --rpc-url REPLACE_WITH_RPC_ENDPOINT --private-key REPLACE_WITH_KEY_THAT_HAS_GAS_TOKENS" />
      </Box>
      <Text mb={4}>
        Verify your project&apos;s contracts on&nbsp;
        <ChakraLink isExternal href={externalLinks.ETHERSCAN}>
          Etherscan
        </ChakraLink>
        :
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon verify sample-foundry-project --api-key REPLACE_WITH_ETHERSCAN_API_KEY --chain-id REPLACE_WITH_CHAIN_ID" />
      </Box>
      <Text mb={4}>
        Finally, publish your package on the&nbsp;
        <Link as={NextLink} href={links.EXPLORE}>
          Cannon registry
        </Link>
        :
      </Text>
      <Box mb={4}>
        <CommandPreview command="cannon publish sample-foundry-project --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET" />
      </Box>
    </>
  );
};
