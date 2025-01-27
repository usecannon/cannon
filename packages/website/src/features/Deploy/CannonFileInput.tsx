import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormControl, FormDescription, FormItem } from '@/components/ui/form';
import { CustomSpinner } from '@/components/CustomSpinner';
import { cn } from '@/lib/utils';

// TODO: Fix error. Check when it is the main input or when is is the secondary input.

// Define interface for component props
interface CannonFileInputProps {
  cannonfileUrlInput: string;
  setCannonfileUrlInput: (value: string) => void;
  cannonDefInfo: {
    isFetching: boolean;
    error: any;
    def: any;
  };
  isDisabled: boolean;
}

export const CannonFileInput = ({
  cannonfileUrlInput,
  setCannonfileUrlInput,
  cannonDefInfo,
  isDisabled,
}: CannonFileInputProps) => {
  const isLoading = cannonfileUrlInput.length > 0 && cannonDefInfo?.isFetching;
  const showCheck =
    cannonfileUrlInput.length > 0 && !cannonDefInfo.error && cannonDefInfo?.def;

  return (
    <FormItem className="mb-4">
      <FormControl>
        <div className="space-y-2">
          <Label>Cannonfile (Optional)</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="https://github.com/../cannonfile.toml"
              value={cannonfileUrlInput}
              className={cn(
                'bg-black',
                cannonDefInfo.error && 'border-destructive',
                'pr-10'
              )}
              disabled={isDisabled}
              onChange={(evt) => setCannonfileUrlInput(evt.target.value)}
            />
            {isLoading && (
              <div className="absolute right-3 top-2.5">
                <CustomSpinner className="h-5 w-5" />
              </div>
            )}
            {showCheck && (
              <div className="absolute right-3 top-2.5">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            )}
          </div>
          <FormDescription className="text-gray-300">
            The Cannonfile URL is used to generate the deployment data to
            display a git diff in Cannon.
          </FormDescription>
        </div>
      </FormControl>

      {cannonDefInfo.error && (
        <Alert variant="destructive" className="mt-6 bg-gray-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-3 font-bold">
            {cannonDefInfo.error.toString()}
          </AlertDescription>
        </Alert>
      )}
    </FormItem>
  );
};
