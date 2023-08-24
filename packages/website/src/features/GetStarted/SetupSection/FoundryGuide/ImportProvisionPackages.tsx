import { Code, Heading, Text } from '@chakra-ui/react';
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
]
depends = ["import.synthetix_omnibus"]`;

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
]
depends=["provision.synthetix"]`;

export const ImportProvisionPackages = () => {
  return (
    <>
      <Heading as="h2" size="md" mt={16} mb={4}>
        🗃️ Import and Provision Packages
      </Heading>
      <Text>
        You can use packages in your Cannonfiles with the import and provision
        actions.
      </Text>

      <Text mt={4}>
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
      <Text mt={4}>
        For example, the Synthetix Sandbox contains a&nbsp;
        <ChakraLink href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml">
          Cannonfile that deploys the sample integration contract connected to
          the official deployment addresses
        </ChakraLink>
        . The relevant code looks like this:
      </Text>

      <CodePreview code={code1} language="toml" />
      <Text mt={4}>
        <Code colorScheme="blackAlpha" variant="solid">
          provision
        </Code>
        packages to deploy new instances of their protocol&apos;s contracts.
      </Text>
      <Text mt={4}>
        For example, the Synthetix Sandbox contains a&nbsp;
        <ChakraLink href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml">
          Cannonfile that provisions a new instance of Synthetix
        </ChakraLink>
        &nbsp;and sets up a custom development environment. This is a simplified
        version of the relevant code:
      </Text>
      <CodePreview code={code2} language="toml" />
    </>
  );
};
