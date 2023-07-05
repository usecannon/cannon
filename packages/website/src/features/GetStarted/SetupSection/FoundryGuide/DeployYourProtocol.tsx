import { Heading, Text } from '@chakra-ui/react';
import { CommandPreview } from '@/components/CommandPreview';
import { externalLinks } from '@/constants/externalLinks';
import NextLink from 'next/link';
import { Link } from '@chakra-ui/next-js';
import { Link as ChakraLink } from '@chakra-ui/react';
import { links } from '@/constants/links';

export const DeployYourProtocol = () => {
  return (
    <>
      <Heading as="h2" size="md" mt={16} mb={4}>
        🚀 Deploy Your Protocol
      </Heading>
      <Text mb={4}>Deploying is just building on a remote network!</Text>
      <CommandPreview command="cannon build --network REPLACE_WITH_RPC_ENDPOINT --private-key REPLACE_WITH_KEY_THAT_HAS_GAS_TOKENS" />
      <Text mt={8} mb={4}>
        Verify your project’s contracts on&nbsp;
        <ChakraLink isExternal href={externalLinks.ETHERSCAN}>
          Etherscan
        </ChakraLink>
        :
      </Text>
      <CommandPreview command="cannon verify sample-foundry-project --api-key REPLACE_WITH_ETHERSCAN_API_KEY --chain-id REPLACE_WITH_CHAIN_ID" />
      <Text mt={8} mb={4}>
        Finally, publish your package on the&nbsp;
        <Link as={NextLink} href={links.EXPLORE}>
          Cannon registry
        </Link>
        :
      </Text>
      <CommandPreview command="cannon publish sample-foundry-project --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET" />
      <Text mt={8} mb={4}>
        <Text as="span" fontWeight="bold">
          Great work!
        </Text>
        &nbsp;Check out the technical reference&nbsp;
        <Link as={NextLink} href={links.TECHNICAL_REF}>
          technical reference
        </Link>
        &nbsp;for more information about the command-line tool and the actions
        you can define in a Cannonfile.
      </Text>
    </>
  );
};
