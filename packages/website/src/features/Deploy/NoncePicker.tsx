import { SafeDefinition } from '@/helpers/store';
import { useSafeTransactions } from '@/hooks/backend';
import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Params {
  safe: SafeDefinition | null;
  handleChange: (nonce: number | null) => void;
}

export default function NoncePicker({ safe, handleChange }: Params) {
  const [isOverridingNonce, setNonceOverride] = useState(false);
  const [currentNonce, setCurrentNonce] = useState<number | null>(null);

  const safeTxs = useSafeTransactions(safe);

  useEffect(() => {
    handleChange(currentNonce);
  }, [currentNonce]);

  useEffect(() => {
    if (!safeTxs.nextNonce) return setCurrentNonce(null);
    setCurrentNonce(isOverridingNonce ? safeTxs.nextNonce - 1 : null);
  }, [isOverridingNonce, safeTxs.nextNonce]);

  if (safeTxs.staged.length === 0) return null;

  return (
    <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Checkbox
                id="override-nonce"
                disabled={!safeTxs.isSuccess || safeTxs.staged.length === 0}
                checked={isOverridingNonce}
                onCheckedChange={(checked) =>
                  setNonceOverride(checked as boolean)
                }
              />
              <label
                htmlFor="override-nonce"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Override Previously Staged Transaction
                {safeTxs.staged.length > 0
                  ? ` (Use nonce ${
                      safeTxs.nextNonce ? safeTxs.nextNonce - 1 : ''
                    })`
                  : ''}
              </label>
            </div>
          </TooltipTrigger>
          {safeTxs.staged.length === 0 && (
            <TooltipContent>
              <p>You must have at least one transaction staged to override</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {isOverridingNonce && (
        <div className="flex flex-row items-center justify-between flex-1">
          <Select
            value={currentNonce?.toString()}
            onValueChange={(value) => {
              const newVal = Number(value);
              if (!Number.isSafeInteger(newVal) || newVal < 0) {
                setCurrentNonce(null);
              } else {
                setCurrentNonce(newVal);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select nonce" />
            </SelectTrigger>
            <SelectContent>
              {safeTxs.staged.map(({ txn }) => (
                <SelectItem key={txn._nonce} value={txn._nonce.toString()}>
                  {txn._nonce}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
