import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatUnits, parseUnits } from 'viem';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface NumberInputProps {
  handleUpdate: (value: bigint | undefined, error?: string) => void;
  value?: bigint;
  suffix?: string;
  showWeiValue?: boolean;
}

// Validates if a string value is a valid uint
function isValidUint(value: string): boolean {
  try {
    const num = BigInt(value);
    return num >= 0n;
  } catch {
    return false;
  }
}

export const NumberInput: FC<NumberInputProps> = ({
  handleUpdate,
  value,
  suffix,
  showWeiValue = false,
}) => {
  const [decimals, setDecimals] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleChange = (inputValue: string) => {
    try {
      if (!inputValue) {
        handleUpdate(undefined);
        setHasError(false);
        return;
      }

      const parsedValue = parseUnits(inputValue, decimals);
      const hasError = !isValidUint(inputValue);

      handleUpdate(parsedValue, hasError ? 'Invalid uint value' : undefined);
      setHasError(hasError);
    } catch (err) {
      handleUpdate(undefined, 'Invalid number format');
      setHasError(true);
    }
  };

  // Handle decimal changes while maintaining the real value
  const handleDecimalChange = (newDecimals: number) => {
    if (value === undefined) {
      setDecimals(newDecimals);
      return;
    }

    // Convert the current value to a decimal string with the current decimals
    const valueInEth = formatUnits(value, decimals);
    setDecimals(newDecimals);

    try {
      // Parse the value with new decimals maintaining the same real value
      const newValue = parseUnits(valueInEth, newDecimals);
      handleUpdate(newValue);
    } catch (err) {
      handleUpdate(undefined, 'Invalid number format');
      setHasError(true);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch">
        <Input
          type="number"
          className={cn(
            'bg-background border-input rounded-r-none h-10',
            hasError &&
              'border-destructive focus:border-destructive focus-visible:ring-destructive'
          )}
          step="1"
          placeholder="0"
          value={value !== undefined ? formatUnits(value, decimals) : ''}
          onChange={(e) => handleChange(e.target.value)}
          data-testid="number-input"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-l-none px-2 h-10 flex items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">{decimals}d</span>
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <Label>Decimal Places</Label>
            <div className="grid gap-4 mt-1">
              <Input
                type="number"
                min="0"
                max="18"
                value={decimals}
                onChange={(e) => handleDecimalChange(Number(e.target.value))}
                className="bg-background"
              />
              <p className="text-sm text-muted-foreground">
                Configure the number of decimal for this value
              </p>
            </div>
          </PopoverContent>
        </Popover>
        {suffix && (
          <div className="flex items-center px-3 py-1 bg-background text-gray-300 border border-l-0 border-border rounded-r-md h-10">
            {suffix}
          </div>
        )}
      </div>
      {showWeiValue && value !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">
          {value.toString()} wei
        </p>
      )}
    </div>
  );
};
