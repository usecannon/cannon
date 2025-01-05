import { CheckIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { CustomSpinner } from '@/components/CustomSpinner';

export type DeployType = 'git' | 'partial';

interface DeploymentSourceInputProps {
  deploymentSourceInput: string;
  setDeploymentSourceInput: (value: string) => void;
  selectedDeployType: DeployType;
  cannonfileUrlInput: string;
  cannonDefInfo: any;
  cannonInfoDefinitionLoaded: boolean;
  partialDeployInfo: any;
  partialDeployInfoLoaded: boolean;
  chainId: number | undefined;
  currentSafe: any;
  cannonDefInfoError: string | null;
  inputError: string | null;
  handleDeploymentSourceInputChange: (value: string) => void;
}

export function DeploymentSourceInput({
  deploymentSourceInput,
  setDeploymentSourceInput,
  selectedDeployType,
  cannonfileUrlInput,
  cannonDefInfo,
  cannonInfoDefinitionLoaded,
  partialDeployInfo,
  chainId,
  currentSafe,
  cannonDefInfoError,
  inputError,
  handleDeploymentSourceInputChange,
}: DeploymentSourceInputProps) {
  return (
    <div>
      <FormItem>
        <FormLabel>Cannonfile URL or Deployment Data IPFS Hash</FormLabel>
        <div className="relative">
          <Input
            type="text"
            placeholder="https://github.com/../cannonfile.toml or Qm.."
            value={deploymentSourceInput}
            className={cn(
              cannonDefInfoError ? 'border-destructive' : '',
              'pr-10'
            )}
            disabled={chainId !== currentSafe?.chainId}
            onChange={(evt) => {
              const value = evt.target.value;
              setDeploymentSourceInput(value);
              handleDeploymentSourceInputChange(value);
            }}
          />
          {selectedDeployType === 'git' && cannonfileUrlInput.length > 0 && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {cannonDefInfo?.isFetching ? (
                <CustomSpinner className="h-4 w-4" />
              ) : cannonInfoDefinitionLoaded ? (
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
        {cannonDefInfoError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              <strong>{cannonDefInfoError.toString()}</strong>
            </AlertDescription>
          </Alert>
        )}
        {inputError && (
          <FormMessage className="text-destructive">{inputError}</FormMessage>
        )}
      </FormItem>
    </div>
  );
}
