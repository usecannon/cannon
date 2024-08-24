import { CommandPreview } from '@/components/CommandPreview';
import IconText from '@/components/IconText';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { Heading } from '@chakra-ui/react';
import Link from 'next/link';

type Props = {
  name: string;
  chainId: number;
  version: string;
  preset: string;
};

export default function RunPackageLocally({
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
            <IconText icon={ExternalLinkIcon} label="Install Cannon CLI" />
          </Heading>
        </Link>
      }
    >
      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />
    </ItemBodyWrapper>
  );
}
