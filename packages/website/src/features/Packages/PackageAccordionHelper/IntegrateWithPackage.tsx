import { CommandPreview } from '@/components/CommandPreview';
import IconText from '@/components/IconText';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { Box, Heading, Text, Tooltip } from '@chakra-ui/react';
import Link from 'next/link';

type Props = {
  name: string;
  chainId: number;
  version: string;
  preset: string;
};

export default function IntegrateWithPackage({
  name,
  chainId,
  version,
  preset,
}: Props) {
  const _version = version !== 'latest' ? `:${version}` : '';
  const _preset = preset !== 'main' ? `@${preset}` : '';
  const _chainId = chainId != 13370 ? ` --chain-id ${chainId}` : '';

  return (
    <ItemBodyWrapper
      titleText={`Run this package on a local ${
        chainId == 13370 ? 'node' : 'fork'
      }`}
      titleAction={
        <Link href="/learn/cli/">
          <Heading size="xs">
            <IconText icon={ExternalLinkIcon} label="Build a cannon file" />
          </Heading>
        </Link>
      }
    >
      <Text mb={2}>Add to a Cannonfile</Text>
      <Box mb={4} p={3} bg="black">
        [pull.blah]
      </Box>

      <Text mb={2}>
        Cannonfile Context Data{' '}
        <Tooltip label='After adding the pull operation to your cannonfile, you reference the following data in other steps like prop="<%= contracts.example %>'>
          <InfoOutlineIcon />
        </Tooltip>
      </Text>

      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />
    </ItemBodyWrapper>
  );
}
