import { FC, useState, useRef, ChangeEvent } from 'react';
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

export const NumberInput: FC<NumberInputProps> = ({
  handleUpdate,
  value,
  suffix,
  showWeiValue = false,
}) => {
  const [decimals, setDecimals] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const checkDecimalPlaces = (input: string | bigint) => {
    let decimalPlaces: number;

    if (typeof input === 'string') {
      decimalPlaces = input.includes('.') ? input.split('.')[1].length : 0;
    } else {
      const decimalValue = formatUnits(input, decimals);
      decimalPlaces = decimalValue.includes('.')
        ? decimalValue.split('.')[1].length
        : 0;
    }

    if (decimalPlaces > decimals) {
      const errorMessage = `Input has more decimal places than allowed (max: ${decimals})`;
      handleUpdate(undefined, errorMessage);
      setError(errorMessage);
      return false;
    }

    setError(undefined);
    return true;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    if (inputValue === '') {
      handleUpdate(undefined);
      setError(undefined);
      return;
    }

    if (!checkDecimalPlaces(inputValue)) {
      return;
    }

    let newValue: bigint | undefined;
    try {
      newValue = parseUnits(inputValue, decimals);
      setError(undefined);
    } catch {
      newValue = undefined;
      setError('Invalid number format');
    }

    handleUpdate(newValue, error);
  };

  const handleDecimalChange = (newDecimals: number) => {
    if (value === undefined) {
      setDecimals(newDecimals);
      return;
    }

    const decimalValue = formatUnits(value, newDecimals);

    if (!checkDecimalPlaces(decimalValue)) {
      return;
    }

    let newValue: bigint | undefined;
    try {
      newValue = parseUnits(decimalValue, newDecimals);
      setError(undefined);
    } catch {
      newValue = undefined;
      setError('Invalid number format');
    }

    setDecimals(newDecimals);
    handleUpdate(newValue, error);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch">
        <Input
          ref={inputRef}
          type="text"
          className={cn(
            'bg-background border-input rounded-r-none h-10',
            error &&
              'border-destructive focus:border-destructive focus-visible:ring-destructive'
          )}
          placeholder="0"
          onChange={handleChange}
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
