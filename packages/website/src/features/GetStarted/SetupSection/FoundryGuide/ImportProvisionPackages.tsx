import { Box, Code, Heading, Text } from '@chakra-ui/react';
import { CodePreview } from '@/components/CodePreview';
import { Link } from '@chakra-ui/next-js';
import NextLink from 'next/link';
import { links } from '@/constants/links';
import { Link as ChakraLink } from '@chakra-ui/react';

const code1 = `[import.synthetix_omnibus]
source ="synthetix-omnibus:latest"

[contract.sample_integration]
artifact = "SampleIntegration"
args = [
    "<%= imports.synthetix_omnibus.contracts.system.CoreProxy %>",
    "<%= imports.synthetix_omnibus.contracts.system.USDProxy %>"
]`;

const code2 = `[provision.synthetix]
source = "synthetix:latest"
owner = "<%= settings.owner %>"

[invoke.createPool]
target = ["synthetix.CoreProxy"]
from = "<%= settings.user %>"
func = "createPool"
args = [
    "1",
    "<%= settings.owner %>"
]`;

export const ImportProvisionPackages = () => {
  return (
    <>
      <Heading size="md" mb={3} mt={8}>
        Import and Provision Packages
      </Heading>
      <Text mb={4}>
        You can use packages in your Cannonfiles with the import and provision
        actions.
      </Text>
      <Text mb={4}>
        <Code colorScheme="blackAlpha" variant="solid">
          import
        </Code>
        &nbsp; packages to reference the addresses in their deployment data.
        Find which networks each package has deployment data for on the&nbsp;
        <Link as={NextLink} href={links.EXPLORE}>
          registry explorer
        </Link>
        .
      </Text>
      <Text mb={4}>
        For example, the Synthetix Sandbox contains a&nbsp;
        <ChakraLink href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml">
          Cannonfile that deploys the sample integration contract connected to
          the official deployment addresses
        </ChakraLink>
        . The relevant code looks like this:
      </Text>
      <Box mb={4}>
        <CodePreview code={code1} language="ini" />
      </Box>
      <Text mb={4}>
        <Code colorScheme="blackAlpha" variant="solid">
          provision
        </Code>{' '}
        packages to deploy new instances of their protocol&apos;s contracts.
      </Text>
      <Text mb={4}>
        For example, the Synthetix Sandbox contains a&nbsp;
        <ChakraLink href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml">
          Cannonfile that provisions a new instance of Synthetix
        </ChakraLink>
        &nbsp;and sets up a custom development environment. This is a simplified
        version of the relevant code:
      </Text>
      <Box mb={4}>
        <CodePreview code={code2} language="ini" />
      </Box>
    </>
  );
};
