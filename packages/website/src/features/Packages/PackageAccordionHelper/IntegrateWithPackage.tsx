import CodePreview from '@/components/CodePreview';
import IconText from '@/components/IconText';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { Box, Flex, Heading, Text, Tooltip } from '@chakra-ui/react';
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
  const pullCode = `[pull.${camelCase(name)}]
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
        <Link href="/learn/cannonfile/">
          <Heading size="xs">
            <IconText icon={ExternalLinkIcon} label="Build a cannon file" />
          </Heading>
        </Link>
      }
    >
      <Text fontSize="xs" mb={1}>
        Add to a Cannonfile
      </Text>
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

      <Flex alignItems="center" mt={2} mb={1}>
        <Text fontSize="xs" mr={1.5}>
          Cannonfile Context Data
        </Text>
        <Tooltip label='After adding the pull operation to your cannonfile, you reference the following data in other steps like prop="<%= contracts.someContract %>'>
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
