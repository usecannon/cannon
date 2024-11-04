import { CommandPreview } from '@/components/CommandPreview';
import { DownloadIcon } from '@radix-ui/react-icons';

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
    <div className="space-y-6">
      <CommandPreview
        command={`cannon inspect ${name}${_version}${_preset}${_chainId} --write-deployments ./deployment`}
      />
      <div className="text-sm text-muted-foreground">
        <button
          onClick={() => handleDownload(addressesAbis)}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <DownloadIcon className="h-4 w-4" />
          Download as JSON
        </button>
      </div>
    </div>
  );
}
