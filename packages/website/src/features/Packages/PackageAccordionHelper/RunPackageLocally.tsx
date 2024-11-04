import { CommandPreview } from '@/components/CommandPreview';
import Link from 'next/link';
import { ArchiveIcon } from '@radix-ui/react-icons';

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
    <div className="space-y-6">
      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />

      <div className="text-sm text-muted-foreground">
        <Link
          href="/learn/cli/"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <ArchiveIcon className="h-4 w-4" />
          Install CLI
        </Link>
      </div>
    </div>
  );
}
