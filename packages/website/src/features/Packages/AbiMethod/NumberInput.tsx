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
import { InputState } from './utils';

interface NumberInputProps {
  handleUpdate: (state: InputState) => void;
  state: InputState;
  suffix?: string;
  showWeiValue?: boolean;
  fixedDecimals?: number;
}

export const NumberInput: FC<NumberInputProps> = ({
  handleUpdate,
  state,
  suffix,
  showWeiValue = false,
  fixedDecimals = 0,
}) => {
  const [decimals, setDecimals] = useState(fixedDecimals);
  const inputRef = useRef<HTMLInputElement>(null);

  const checkDecimalPlaces = (input: string) => {
    const decimalPlaces = input.includes('.') ? input.split('.')[1].length : 0;
    if (decimalPlaces > decimals) {
      return false;
    }
    return true;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    if (inputValue === '') {
      handleUpdate({
        inputValue: '',
        parsedValue: undefined,
        error: undefined,
      });
      return;
    }

    if (!checkDecimalPlaces(inputValue)) {
      handleUpdate({
        inputValue,
        parsedValue: undefined,
        error: `Input has more decimal places than allowed (max: ${decimals})`,
      });
      return;
    }

    try {
      const parsedValue = parseUnits(inputValue, decimals);
      handleUpdate({
        inputValue,
        parsedValue,
        error: undefined,
      });
    } catch {
      handleUpdate({
        inputValue,
        parsedValue: undefined,
        error: 'Invalid number format',
      });
    }
  };

  const handleDecimalChange = (newDecimals: number) => {
    setDecimals(newDecimals);

    if (!state.inputValue) {
      return;
    }

    try {
      // Convert the current value to the new decimal places
      const currentValue = parseUnits(state.inputValue, decimals);
      const adaptedValue = formatUnits(currentValue, newDecimals);

      // Check if the adapted value has more decimals than allowed
      if (
        adaptedValue.includes('.') &&
        adaptedValue.split('.')[1].length > newDecimals
      ) {
        handleUpdate({
          inputValue: state.inputValue,
          parsedValue: undefined,
          error: `Value has more decimal places than allowed (max: ${newDecimals})`,
        });
        return;
      }

      // Update with the adapted value
      const newValue = parseUnits(adaptedValue, newDecimals);
      handleUpdate({
        inputValue: adaptedValue,
        parsedValue: newValue,
        error: undefined,
      });
    } catch {
      handleUpdate({
        inputValue: state.inputValue,
        parsedValue: undefined,
        error: 'Invalid number format',
      });
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch">
        <Input
          ref={inputRef}
          type="text"
          className={cn(
            'bg-background border-input rounded-r-none h-10',
            state.error &&
              'border-destructive focus:border-destructive focus-visible:ring-destructive'
          )}
          placeholder="0"
          value={state.inputValue as string}
          onChange={handleChange}
          data-testid="number-input"
        />
        {!fixedDecimals && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-l-none px-2 h-10 flex items-center gap-1"
              >
                <span className="text-xs text-muted-foreground">
                  {decimals}d
                </span>
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
        )}
        {suffix && (
          <div className="flex items-center px-3 py-1 bg-background text-gray-300 border border-l-0 border-border rounded-r-md h-10">
            {suffix}
          </div>
        )}
      </div>
      {showWeiValue && state.parsedValue && (
        <p className="text-xs text-muted-foreground mt-1">
          {state.parsedValue.toString()} wei
        </p>
      )}
    </div>
  );
};
