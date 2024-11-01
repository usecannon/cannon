import { CommandPreview } from '@/components/CommandPreview';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Retrieve addresses and ABIs</h3>
        <Button
          variant="secondary"
          onClick={() => handleDownload(addressesAbis)}
        >
          Download JSON
        </Button>
      </div>
      <CommandPreview
        command={`cannon inspect ${name}${_version}${_preset}${_chainId} --write-deployments ./deployment`}
      />
    </div>
  );
}
