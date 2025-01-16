import { CheckIcon, XIcon } from 'lucide-react';
import NextLink from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';
import { cn } from '@/lib/utils';

interface PreviousPackageInputProps {
  previousPackageInput: string;
  setPreviousPackageInput: (value: string) => void;
  prevCannonDeployInfo: any;
  onChainPrevPkgQuery: any;
}

export function PreviousPackageInput({
  previousPackageInput,
  setPreviousPackageInput,
  prevCannonDeployInfo,
  onChainPrevPkgQuery,
}: PreviousPackageInputProps) {
  return (
    <div className="mb-6">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Previous Package
        </label>
        <div className="relative">
          <input
            placeholder="name:version@preset"
            type="text"
            value={previousPackageInput}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-black px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              !previousPackageInput.length || !prevCannonDeployInfo.error
                ? 'border-input'
                : 'border-red-500'
            )}
            onChange={(evt: any) => setPreviousPackageInput(evt.target.value)}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {prevCannonDeployInfo.isError ? (
              <XIcon className="h-4 w-4 text-red-500" />
            ) : null}
            {prevCannonDeployInfo.isFetching ? (
              <CustomSpinner className="h-4 w-4" />
            ) : prevCannonDeployInfo.ipfsQuery.data?.deployInfo ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Optionally, specify the last package published after deploying this
          protocol. See{' '}
          <NextLink
            href="/learn/cli#build"
            className="font-mono text-primary underline-offset-4 hover:no-underline hover:opacity-70 transition-all"
          >
            --upgrade-from
          </NextLink>
        </p>
      </div>
      {onChainPrevPkgQuery.error ? (
        <div className="mt-6 rounded-md bg-red-700/30 p-3 text-sm flex items-center gap-2">
          <XIcon className="h-4 w-4 text-red-500" />
          <strong>{onChainPrevPkgQuery.error.toString()}</strong>
        </div>
      ) : undefined}
    </div>
  );
}
