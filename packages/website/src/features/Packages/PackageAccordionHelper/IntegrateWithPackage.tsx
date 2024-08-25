import CodePreview from '@/components/CodePreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { Button, Flex, Text, Tooltip } from '@chakra-ui/react';
import Link from 'next/link';
import camelCase from 'lodash/camelCase';
import { ChainDefinition, getArtifacts } from '@usecannon/builder';
import { DeploymentState } from '@usecannon/builder/src';

type Props = {
  name: string;
  chainId: number;
  preset: string;
  chainDefinition: ChainDefinition;
  deploymentState: DeploymentState;
};

export default function IntegrateWithPackage({
  name,
  chainId,
  preset,
  chainDefinition,
  deploymentState,
}: Props) {
  const pullCode = `[${chainId == 13370 ? 'clone' : 'pull'}.${camelCase(name)}]
source = "${name.toLowerCase()}"
chainId = ${chainId}
preset = "${preset}"`;

  const contextDataCode = getArtifacts(chainDefinition, deploymentState);

  return (
    <ItemBodyWrapper
      titleText={`Run this package on a local ${
        chainId == 13370 ? 'node' : 'fork'
      }`}
      titleAction={
        <Button
          variant="outline"
          colorScheme="white"
          size="xs"
          bg="teal.900"
          borderColor="teal.500"
          _hover={{ bg: 'teal.800' }}
          as={Link}
          href="/learn/cannonfile/"
          textTransform="uppercase"
          letterSpacing="1px"
          pt={0.5}
          fontFamily="var(--font-miriam)"
          color="gray.200"
          fontWeight={500}
        >
          Build a cannonfile
        </Button>
      }
    >
      <Flex alignItems="center" mb={2}>
        <Text mr={1.5} fontSize="sm" color="gray.200">
          Add to Cannonfile
        </Text>
        <Tooltip label="Options listed below show their default values. You can override them or omit them from your cannonfiles.">
          <InfoOutlineIcon boxSize={3} />
        </Tooltip>
      </Flex>
      <CodePreview
        code={pullCode}
        height="80px"
        language="ini"
        editorProps={{
          options: {
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          },
        }}
      />

      <Flex alignItems="center" mt={4} mb={2}>
        <Text mr={1.5} fontSize="sm" color="gray.200">
          Cannonfile Context Data
        </Text>
        <Tooltip
          label={`After adding the ${
            chainId == 13370 ? 'clone' : 'pull'
          } operation to your cannonfile, you can reference the following data in other operations using EJS syntax.`}
        >
          <InfoOutlineIcon boxSize={3} />
        </Tooltip>
      </Flex>

      <CodePreview
        code={JSON.stringify(contextDataCode, null, 2)}
        height="250px"
        language="ini"
        editorProps={{
          options: {
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          },
        }}
      />
    </ItemBodyWrapper>
  );
}
