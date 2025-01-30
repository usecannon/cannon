import { CheckIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { CustomSpinner } from '@/components/CustomSpinner';
import { SafeDefinition } from '@/helpers/store';

export type DeployType = 'git' | 'partial';

interface DeploymentSourceInputProps {
  isLoading: boolean;
  error?: string;
  loaded: boolean;
  deploymentSourceInput: string;
  setDeploymentSourceInput: (value: string) => void;
  selectedDeployType: DeployType;
  cannonfileUrlInput: string;
  partialDeployInfo: any;
  chainId: number | undefined;
  currentSafe: SafeDefinition;
  inputError: string | null;
  handleDeploymentSourceInputChange: (value: string) => void;
}

export function DeploymentSourceInput({
  isLoading,
  error,
  loaded,
  deploymentSourceInput,
  setDeploymentSourceInput,
  selectedDeployType,
  cannonfileUrlInput,
  partialDeployInfo,
  chainId,
  currentSafe,
  inputError,
  handleDeploymentSourceInputChange,
}: DeploymentSourceInputProps) {
  return (
    <div>
      <FormItem>
        <FormLabel>Enter cannonfile URL or deployment data IPFS hash</FormLabel>
        <div className="relative">
          <Input
            type="text"
            placeholder="https://github.com/../cannonfile.toml or Qm.."
            value={deploymentSourceInput}
            className={cn(inputError ? 'border-destructive' : '', 'pr-10')}
            disabled={chainId !== currentSafe?.chainId}
            onChange={(evt) => {
              const value = evt.target.value;
              setDeploymentSourceInput(value);
              handleDeploymentSourceInputChange(value);
            }}
          />
          {selectedDeployType === 'git' && cannonfileUrlInput.length > 0 && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {isLoading ? (
                <CustomSpinner className="h-4 w-4" />
              ) : error ? (
                <XIcon className="h-4 w-4 text-destructive" />
              ) : loaded ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}
          {selectedDeployType === 'partial' && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {partialDeployInfo?.isError && (
                <XIcon className="h-4 w-4 text-destructive" />
              )}
              {partialDeployInfo?.isFetching && !partialDeployInfo?.isError && (
                <CustomSpinner className="h-4 w-4" />
              )}
              {partialDeployInfo?.ipfsQuery.data?.deployInfo && (
                <CheckIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
          )}
        </div>
        {inputError && (
          <FormMessage className="text-destructive">{inputError}</FormMessage>
        )}
      </FormItem>
    </div>
  );
}
