import { CommandPreview } from '@/components/CommandPreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { Button } from '@/components/ui/button';

type Props = {
  name: string;
  chainId: number;
  version: string;
  preset: string;
  addressesAbis: Record<string, unknown>;
};

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
        <Button
          variant="secondary"
          onClick={() => handleDownload(addressesAbis)}
        >
          Download JSON
        </Button>
      }
    >
      <CommandPreview
        command={`cannon inspect ${name}${_version}${_preset}${_chainId} --write-deployments ./deployment`}
      />
    </ItemBodyWrapper>
  );
}
