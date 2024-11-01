import { CommandPreview } from '@/components/CommandPreview';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Run this package on a local {chainId == 13370 ? 'node' : 'fork'}
        </h3>
        <Button variant="secondary" asChild>
          <Link href="/learn/cli/">Install CLI</Link>
        </Button>
      </div>
      <CommandPreview
        command={`cannon ${name}${_version}${_preset}${_chainId}`}
      />
    </div>
  );
}
