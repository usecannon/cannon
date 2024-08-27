import ButtonOutlined from '@/components/buttons/Outlined';
import { CommandPreview } from '@/components/CommandPreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
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
        <ButtonOutlined buttonProps={{ as: Link, href: '/learn/cli/' }}>
          Install CLI
        </ButtonOutlined>
      }
    >
      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />
    </ItemBodyWrapper>
  );
}
