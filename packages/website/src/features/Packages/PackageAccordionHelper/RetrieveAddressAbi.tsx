import { CommandPreview } from '@/components/CommandPreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { Button } from '@chakra-ui/react';
import { FC } from 'react';

type Props = {
  name: string;
  chainId: number;
  version: string;
  preset: string;
  addressesAbis: Record<string, unknown>;
};

const DownloadButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="outline"
    colorScheme="white"
    size="xs"
    bg="teal.900"
    borderColor="teal.500"
    _hover={{ bg: 'teal.800' }}
    onClick={onClick}
    textTransform="uppercase"
    letterSpacing="1px"
    pt={0.5}
    fontFamily="var(--font-miriam)"
    color="gray.200"
    fontWeight={500}
  >
    Download JSON
  </Button>
);

const handleDownload = (addressesAbis: Record<string, unknown>) => {
  const blob = new Blob([JSON.stringify(addressesAbis, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'deployments.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function RetrieveAddressAbi({
  name,
  chainId,
  version,
  preset,
  addressesAbis,
}: Props) {
  const _version = version !== 'latest' ? `:${version}` : '';
  const _preset = preset !== 'main' ? `@${preset}` : '';
  const _chainId = chainId != 13370 ? ` --chain-id ${chainId}` : '';
  return (
    <ItemBodyWrapper
      titleText="Retrieve addresses and ABIs"
      titleAction={
        <DownloadButton onClick={() => handleDownload(addressesAbis)} />
      }
    >
      <CommandPreview
        command={`cannon inspect ${name}${_version}${_preset}${_chainId} --write-deployments ~/cannon/${name}:${version}`}
      />
    </ItemBodyWrapper>
  );
}
